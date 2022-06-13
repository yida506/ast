const fs = require('fs');
//解析器
const {parse} = require("@babel/parser");
generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
// let encode_file = 'html_test.js',decode_file = 'node_decode.js';
// let js_code = fs.readFileSync(encode_file, {encoding: "utf-8"});
// ast_code = parse(js_code);



// 节点合并算法
class SwitchNodeMerge {
    //begin_value 初始值
    //arr_statement 控制流数组 type: arrayexpression
    //switch_statement 控制流部分 WhileStatement, body[0]代表获取控制流参数部分, body[1]代表SwitchStatement
    constructor(arr_statement, switch_statement, switch_test_name) {
        this.arr_statement = arr_statement;
        this.switch_statement = switch_statement;
        this.switch_test_name = switch_test_name;
    };

    get_switch_case(casenodes, casevalue){
        for(let casenode of casenodes){
            if(casenode.test.value == casevalue){
                return casenode
            }
        }
    };

    // 计算节点的值
    NodeValueCaculator(current_index ,body_statement, switch_test_name){
        if(body_statement.expression.operator == '+='){
            if(types.isNumericLiteral(body_statement.expression.right)){
                current_index += body_statement.expression.right.value;
            }else if(types.isUnaryExpression(body_statement.expression.right)){
                current_index -= body_statement.expression.right.argument.value;
            }
        }else if(body_statement.expression.operator == '-='){
            current_index -= body_statement.expression.right.value;
        }
        return current_index;
    }

    //last_arr 用于记录
    Merge(nodevalue, arr, last_arr){
        console.log('当前节点的索引是'+nodevalue);
        // console.log('当前节点的值为'+this.arr_statement.elements[nodevalue].value);
        // console.log('当前节点的Body为'+generator(this.get_switch_case(this.switch_statement.cases, this.arr_statement.elements[nodevalue].value)).code);
        let current_index = nodevalue;
        let current_switch_value = this.arr_statement.elements[nodevalue].value;
        let body_statements = this.get_switch_case(this.switch_statement.cases, current_switch_value);
        let the_last_arr = body_statements.consequent[0];
        console.log('当前body',generator(body_statements.consequent[0]).code)
        for(let body_statement of body_statements.consequent){
            if(types.isIfStatement(body_statement)){
                if(body_statement.alternate == null){
                    for(let if_body of body_statement.consequent.body){
                        if(types.isAssignmentExpression(if_body.expression) && if_body.expression.left.name === this.switch_test_name){
                            let if_value_index = this.NodeValueCaculator(current_index+1, if_body, this.switch_test_name);
                            console.log("进入If");
                            let if_arr = this.Merge(if_value_index, [], the_last_arr);
                            console.log("if 结束");
                            arr.push(types.ifStatement(body_statement.test, types.blockStatement(if_arr), null ));
                        }
                    };
                };
                continue;
            }
            if(types.isBreakStatement(body_statement)) continue;
            if(types.isContinueStatement(body_statement)) continue;
            //如果是赋值表达式,就计算节点的值
            if(types.isAssignmentExpression(body_statement.expression) && body_statement.expression.left.name === this.switch_test_name){
                current_index = this.NodeValueCaculator(current_index, body_statement, this.switch_test_name)
                continue;
            }
            arr.push(body_statement);
        };
        current_index += 1;
        if(types.isReturnStatement(arr[arr.length-1])){
            return arr;
        }else{
            this.Merge(current_index, arr);
        }
        return arr;
    }
};

//if表达式规范化
const if2repalce = {
    IfStatement(path){
        let consequentPath = path.get('consequent');
        if(!types.isBreakStatement(consequentPath.node)){
            consequentPath.replaceWith(types.blockStatement([consequentPath.node]));
        }
    },
}
// traverse(ast_code, if2repalce)

const test = {
    FunctionDeclaration(path){
        let {body} = path.node;
        let expression = body.body[0];
        let arr_statement = expression.declarations[0].init;
        let while_statement = body.body[1];
        let switch_body = while_statement.body.body[1];
        let switch_cases = switch_body.cases;
        //决定switch流程的值
        let switch_test_name = while_statement.body.body[0].expression.right.property.argument.name;
        // console.log(generator(expression).code);
        let Switch_Repalce = new SwitchNodeMerge(arr_statement, switch_body, switch_test_name);
        let out_arr = Switch_Repalce.Merge(0, []);
    }


};

// traverse(ast_code, test);


exports.SwitchNodeMerge = SwitchNodeMerge;






//生成新的js code，并保存到文件中输出
// let {code} = generator(ast_code);
// fs.writeFile(decode_file, code, (err)=>{});
