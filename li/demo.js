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

function get_switch_val(switch_body_arr, swiobj){
    const {discriminant, cases} = swiobj;
    for(let casenode of cases){
        if(types.isSwitchStatement(casenode.consequent[0])){
            get_switch_val(switch_body_arr, casenode.consequent[0])
        }else{
            for(let i of casenode.consequent){
                // console.log(i.type,'------',generator(i).code);
                if(types.isAssignmentExpression(i.expression) && i.expression.left.name == 'a'){
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
        let init_params_body = get_other_expression(body.body);
        let SwitchNode = get_switch_expression(body.body);
        let return_obj_statement = return_obj_create(init, init_params_body);
        var switch_body_arr = [];
        get_switch_val(switch_body_arr, SwitchNode);
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
        path.stop()
    }
};

traverse(ast_code, ThreeSwithNormal);


// 单次引用的可以直接替换
const SwithMerge1 = {
    "SwitchStatement"(path){
       const {discriminant, cases} = path.node;
       let switch_var_name = discriminant.name;
       let binding = path.scope.getBinding(switch_var_name);
       let references = binding.referencePaths;
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
       console.log(switchhash)
    }
};

traverse(ast_code, SwithMerge1);

// todo 针对if表达式的还原,采用遍历进入If表达式然后判断其子节点的类型在决定是否替换.
// todo 先还原所有的if表达式,在进行下一步替换






//生成新的js code，并保存到文件中输出
let {code} = generator(ast_code);
fs.writeFile(decode_file, code, (err)=>{});