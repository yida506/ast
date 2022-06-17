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
                if(types.isAssignmentExpression(i.expression) && i.expression.left.name == 'a'){
                    switch_body_arr.push(i.expression.right.value);
                }else if(types.isIfStatement(i)){
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

const ThreeSwithNormal = {
    "ForStatement"(path){
        const {init,test,update,body} = path.node;
        let var_name = init.declarations[0].id.name;
        if(update) return;
        if(!init) return;
        let init_params_body = get_other_expression(body.body);
        let SwitchNode = get_switch_expression(body.body);
        let return_obj_statement = return_obj_create(init, init_params_body);
        let switch_body_arr = [];
        get_switch_val(switch_body_arr, SwitchNode);
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
        for(let i of switch_body_arr){
            if(i){
                normal_switch_arr.push(types.switchCase(types.valueToNode(i),get_lowest_node(init_data(i),SwitchNode,SwitchObj)));
            }
        };
        path.replaceWith(types.forStatement(init,test,update, types.switchStatement(init.declarations[0].id,normal_switch_arr)));
        path.stop()
    }
};

traverse(ast_code, ThreeSwithNormal);










//生成新的js code，并保存到文件中输出
let {code} = generator(ast_code);
fs.writeFile(decode_file, code, (err)=>{});