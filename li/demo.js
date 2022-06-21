const fs = require('fs');
//解析器
const {parse} = require("@babel/parser");
generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
let encode_file = 'encode.js',decode_file = 'decode.js';
let js_code = fs.readFileSync(encode_file, {encoding: "utf-8"});
ast_code = parse(js_code);


/*
三重还原为一重
 */
function get_other_expression(arr){
    let temparr = [];
    for(let i of arr){
        if(!types.isSwitchStatement(i)){
            temparr.push(i);
        };
    };
    return temparr;
};

function get_switch_expression(arr){
    for(let i of arr){
        if(types.isSwitchStatement(i)){
            return i
        };
    };
    return false
};

function get_switch_val(switch_body_arr, swiobj, baseswitchvar){
    const {cases} = swiobj;
        for(let casenode of cases){
            if(types.isSwitchStatement(casenode.consequent[0])){
                get_switch_val(switch_body_arr, casenode.consequent[0],baseswitchvar)
            }else{
                for(let i of casenode.consequent){
                    // console.log(i.type,'------',generator(i).code);
                    if(types.isAssignmentExpression(i.expression) && i.expression.left.name == baseswitchvar){
                        switch_body_arr.push(i.expression.right.value);
                    }else if(types.isIfStatement(i)){
                        // console.log(i.type,'------',generator(i).code,'-----',i.alternate.body[0].expression.right.value);
                        const {test, consequent, alternate} = i;
                        switch_body_arr.push(i.alternate.body[0].expression.right.value);
                        switch_body_arr.push(i.consequent.body[0].expression.right.value);
                    }
                }
        }
    }
};

function return_obj_create(init_expression, init_params_body){
    let temparr = [];
    for(let exp of init_params_body){
        temparr.push(types.objectProperty(types.stringLiteral(exp.declarations[0].id.name), exp.declarations[0].id));
    };
    temparr.push(types.objectProperty(types.stringLiteral(init_expression.declarations[0].id.name), init_expression.declarations[0].id));
    let now_obj = types.objectExpression(temparr);
    return now_obj;
};

//游走到最底层节点
function get_lowest_node(init_value,SwitchNode, SwitchObj){
    //给定初始对象
    let test_var = SwitchNode.discriminant.name;
    //获取当前对象的初始值
    let now_case_value = init_value[test_var];
    //进入最底层
    let now_node;
    if(types.isSwitchStatement(SwitchNode.cases[now_case_value].consequent[0])){
        // console.log(generator(SwitchNode.cases[now_case_value].consequent[0]).code);
        now_node = get_lowest_node(init_value, SwitchNode.cases[now_case_value].consequent[0], SwitchObj[now_case_value])
    }else {
        now_node = SwitchObj[now_case_value];
    };
    return now_node;

};

function get_switch_obj(SwitchNode){
    let CaseNode = SwitchNode.cases;
    let current_obj = {}
    for(let i of CaseNode){
        //如果节点里为SwitchStatement
        if(get_switch_expression(i.consequent)){
            current_obj[i.test.value] = get_switch_obj(get_switch_expression(i.consequent));
        }else {
            current_obj[i.test.value] = i.consequent;
        }
    };
    return current_obj;
};

var uniqueFilter = function(arr) {
    return arr.filter(function(elem, pos, self) {
        // 如果没有重复项，返回true，返回false的是有对应的elem会被删除
        return self.indexOf(elem, pos + 1) === -1;
    });
};

/*
通过将a = i 这种赋值表达式取出,然后计算出最底层节点对应的初始参数的值,将其转化为一层控制流
 */

const ThreeSwithNormal = {
    "ForStatement"(path){
        const {init,test,update,body} = path.node;
        let var_name = init.declarations[0].id.name;
        if(update) return;
        if(!init) return;
        if(!body.body) return;
        let init_params_body = get_other_expression(body.body);
        // 获取for循环中的switch部分
        let SwitchNode = get_switch_expression(body.body);
        let return_obj_statement = return_obj_create(init, init_params_body);
        var switch_body_arr = [];
        /*
            switch_body_arr: 用于保存case
            SwitchNode: for循环中的switch部分
            var_name: 初始参数名称,用于节点合并
         */
        get_switch_val(switch_body_arr, SwitchNode, var_name);
        switch_body_arr.push(init.declarations[0].init.value);
        let switch_result = uniqueFilter(switch_body_arr);
        // console.log(switch_result);
        init_params_body.push(types.returnStatement(return_obj_statement));
        //将初始化的值eval进内存.后续可以直接调用
        eval(generator(types.functionDeclaration(types.identifier('init_var_identify'),
            [init.declarations[0].id],
            types.blockStatement([types.returnStatement(test)])
        )).code);
        eval(generator(types.functionDeclaration(types.identifier('init_data'),
            [init.declarations[0].id],
            types.blockStatement(init_params_body)
        )).code);

        let SwitchObj = get_switch_obj(SwitchNode);

        let normal_switch_arr = [];
        for(let i of switch_result){
            if(i !== undefined){
                normal_switch_arr.push(types.switchCase(types.valueToNode(i),get_lowest_node(init_data(i),SwitchNode,SwitchObj)));
            }
        };
        path.replaceWith(types.forStatement(init,test,update, types.switchStatement(init.declarations[0].id,normal_switch_arr)));
        // path.stop()
    }
};

traverse(ast_code, ThreeSwithNormal);





// 根据case节点的索引值,获取其path
function get_case_path(casespath,swithcases,value){
    for(let swithcase of swithcases){
        if(swithcase.test.value == value){
            return casespath[swithcases.indexOf(swithcase)]
        }
    }
};

/*
    针对绑定次数为1的情况,都可以直接还原
*/


function get_binding_times(path, switchhash){

}


const SwithMerge = {
    "SwitchStatement"(path){
       const {discriminant, cases} = path.node;
       let casePath = path.get('cases');
       let switch_var_name = discriminant.name;
       let switchhash = {};
       // 获取被引用的次数
       path.scope.traverse(path.scope.block, {
           AssignmentExpression(_path){
               const {left, right} = _path.node;
               if(left.name !== switch_var_name) return;
               // console.log(_path.toString())
               if(!switchhash[right.value]){
                   switchhash[right.value] = 1
               }else{
                   switchhash[right.value] += 1
               }
           }
       });
       //删除未定义
       delete switchhash[undefined];
       /*
           针对绑定次数为1的情况,都可以直接还原,
           此处需要遍历AssignmentExpression,然后替换,接着删除对应case节点
       */
        path.scope.traverse(path.scope.block, {
           AssignmentExpression(_path){
               const {left, right} = _path.node;
               if(left.name !== switch_var_name) return;
               if(switchhash[right.value] == 1){
                   let Nextpath = get_case_path(casePath, cases, right.value);
                   // 当前节点替换
                   _path.parentPath.replaceWithMultiple(Nextpath.node.consequent.filter(item=>item.type !== 'BreakStatement'));
                   switchhash[right.value] -= 1;
               };
           }
       });
       // //  //删除已合并的1级控制流
        for(let item of casePath){
            if(switchhash[item.node.test.value] === 0) item.remove();
        };

        /*
        第一种if替换
        对于if(){
            xxx
            a = 1
            }else{
            a = 1
            }
            ---->
            if(){
            xxx
            }
            a = 1
            只需要判断 节点值是否相等然后调整if表达式即可

         */
        path.scope.traverse(path.scope.block, {
            "IfStatement":{
                exit:function (_path){
                    const {test, consequent, alternate} = _path.node;
                    //单if的情况
                    if(!alternate) return;
                    let consequentexp = consequent.body[consequent.body.length-1],alternateexp = alternate.body[alternate.body.length-1];
                    if(types.isAssignmentExpression(consequentexp.expression) && types.isAssignmentExpression(alternateexp.expression)){
                        // console.log(_path.toString());
                        //第一种情况 针对值相同
                        if(consequentexp.expression.right.value === alternateexp.expression.right.value){
                            if(consequent.body.length > 1){
                                _path.replaceWithMultiple([
                                    types.IfStatement(test,
                                        types.BlockStatement(consequent.body.splice(0,consequent.body.length-1))),
                                    consequentexp]);
                            }else if(alternate.body.length > 1){
                                _path.replaceWithMultiple([
                                    types.IfStatement(types.UnaryExpression('!',test),
                                        types.BlockStatement(alternate.body.splice(0,alternate.body.length-1))),
                                    consequentexp])
                            }
                        };
                    };
                }
        }});

        /*
            针对类似for循环的游走合并
         */
        path.scope.traverse(path.scope.block, {
            "IfStatement"(_path){
                const {test, consequent, alternate} = _path.node;
                if(!types.isBinaryExpression(test)) return;
                let consequentexp = consequent.body[consequent.body.length-1], alternateexp = alternate.body[alternate.body.length-1];
                // console.log('----------------');
                // console.log('parent', _path.parent.test.value)
                // console.log(_path.toString());
                if(types.isExpressionStatement(consequentexp)){
                    // 如果值相同,说明可以直接替换成for循环的形式
                    if(_path.parent.test.value == consequentexp.expression.right.value){
                        _path.replaceWithMultiple([
                            types.ForStatement(null,test,null,
                                types.BlockStatement(consequent.body.splice(0, consequent.body.length-1))
                            ),...alternate.body]
                        )
                    }else if(_path.parent.test.value != consequentexp.expression.right.value){
                        // 继续向下游走,暂时只考虑只需要游走一次的情况
                        console.log('----------------');
                        console.log('parent', _path.parent.test.value)
                        console.log(_path.toString());
                        // todo 解决查不到case节点的Bug
                        let Nextpath = get_case_path(casePath, cases, consequentexp.expression.right.value);
                        // _path.replaceWithMultiple([
                        //     types.ForStatement(null,test,null,
                        //         types.BlockStatement([...consequent.body.splice(0, consequent.body.length-1),...Nextpath.node.consequent])
                        //     ),...alternate.body]
                        // )
                    }
                }
            }
        });


        // switchhash = {};
        // path.scope.traverse(path.scope.block, {
        //     AssignmentExpression(_path){
        //         const {left, right} = _path.node;
        //         if(left.name !== switch_var_name) return;
        //         // console.log(_path.toString())
        //         if(!switchhash[right.value]){
        //             switchhash[right.value] = 1
        //         }else{
        //             switchhash[right.value] += 1
        //         }
        //     }
        // });
        // console.log(switchhash)
    }
};

traverse(ast_code, SwithMerge);







//生成新的js code，并保存到文件中输出
let {code} = generator(ast_code);
fs.writeFile(decode_file, code, (err)=>{});
