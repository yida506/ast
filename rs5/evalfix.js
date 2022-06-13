const fs = require('fs');
//解析器
const {parse} = require("@babel/parser");
generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
let encode_file = 'eval.js',decode_file = 'eval_decode.js';
let js_code = fs.readFileSync(encode_file, {encoding: "utf-8"});
const nodeMerge = require('./NodeMerge')





ast_code = parse(js_code);





//逗号表达式还原
const CommaReplace = {
    VariableDeclaration(path){
        const {declarations} = path.node;
        if(declarations.length <= 1) return;
        // console.log(path.toString());
        let arr = [];
        for(let declartor of declarations){
            arr.push(types.variableDeclaration('var',[declartor]))
            // console.log(generator(declartor).code);
        };
        path.replaceWithMultiple(arr);
    },

};

traverse(ast_code, CommaReplace);

// 控制流流程还原
const ArrReplace = {
    VariableDeclarator(path){
        const {id, init} = path.node;
        if(!types.isArrayExpression(init)) return;
        if(init.elements.length <= 1) return;
        // console.log(path.toString());
        let binding = path.scope.getBinding(id.name);
        let referencePaths = binding.referencePaths;
        for(let referencePath of referencePaths){
            // console.log(referencePath.parentPath.toString());
            if(!types.isNumericLiteral(referencePath.parent.property)) return;
            let arr_index = referencePath.parent.property.value;
            // console.log(generator(init.elements[arr_index]).code);
            referencePath.parentPath.replaceInline(init.elements[arr_index]);
        };
        path.stop();
    }

};

traverse(ast_code, ArrReplace);


function getIfnode(testNode, consequentNode, alternateNode){
    let currentvalue = testNode.right.value;
    if(types.isIfStatement(consequentNode.body[0]) && types.isBinaryExpression(consequentNode.body[0].test)){
        getIfnode(consequentNode.body[0].test,consequentNode.body[0].consequent, consequentNode.body[0].alternate);
    };
    if(types.isBlockStatement(alternateNode) && types.isIfStatement(alternateNode.body[0]) && types.isBinaryExpression(alternateNode.body[0].test)){
        getIfnode(alternateNode.body[0].test,alternateNode.body[0].consequent, alternateNode.body[0].alternate);
    };
    if(types.isIfStatement(alternateNode)){
        getIfnode(alternateNode.test,alternateNode.consequent, alternateNode.alternate);
    };
    //限定条件,生成switch节点
    // console.log(generator(consequentNode).code, 'if --->',!types.isIfStatement(consequentNode.body[0]) || !types.isBinaryExpression(consequentNode.body[0].test));
    if(!types.isIfStatement(consequentNode.body[0]) || !types.isBinaryExpression(consequentNode.body[0].test)){
        fullNode[currentvalue-1] = consequentNode.body[0];
    };
    // console.log(generator(alternateNode).code, 'else --->',!types.isIfStatement(alternateNode)  && (types.isBlockStatement(alternateNode) || (!types.isIfStatement(alternateNode.body[0]) && !types.isBinaryExpression(alternateNode.body[0].test))));
    if(!types.isIfStatement(alternateNode)
        && !(types.isIfStatement(alternateNode.body[0]) && types.isBinaryExpression(alternateNode.body[0].test))
    ){
        fullNode[currentvalue] = alternateNode.body[0];
    }
}

var fullNode = {};
// if表达式转switch_case
const If2Switch = {
    WhileStatement(path){
        const {test, body} = path.node;
        if(!types.isNumericLiteral(test)) return;
        if(!types.isMemberExpression(body.body[0].expression.right)) return;
        //声明控制流开始部分
        let ifPath = path.get('body').get('body')[1];
        let begin_statement = body.body[0];
        let if_statement = body.body[1];
        getIfnode(if_statement.test, if_statement.consequent, if_statement.alternate);
        let swichcasearr = [];
        for(let i in fullNode){
            if(fullNode[i] !== undefined){
                if(types.isBlockStatement(fullNode[i])){
                    fullNode[i].body.push(types.breakStatement());
                    swichcasearr.push(types.switchCase(types.NumericLiteral(Number(i)), fullNode[i].body));
                }else {
                    swichcasearr.push(types.switchCase(types.NumericLiteral(Number(i)), [fullNode[i],types.breakStatement()]));
                }
            }else{
                swichcasearr.push(types.switchCase(types.NumericLiteral(Number(i)), [types.breakStatement()]));
            }
        };
        ifPath.replaceWith(types.switchStatement(types.identifier(begin_statement.expression.left.name), swichcasearr))
        fullNode = {};
    }
};

traverse(ast_code, If2Switch);

// switch还原

//if表达式规范化
const IfNormal = {
    IfStatement(path){
        let consequentPath = path.get('consequent');
        if(types.isBlockStatement(consequentPath.node)) return;
        if(!types.isBreakStatement(consequentPath.node)){
            consequentPath.replaceWith(types.blockStatement([consequentPath.node]));
        }
    },
}
traverse(ast_code, IfNormal)

function get_while_statement(bodyarr){
    for(let expression of bodyarr){
        if(types.isWhileStatement(expression)) return expression;
    }
    return false;
};

function get_while_arr(bodyarr){
    for(let expression of bodyarr) {
        if(types.isVariableDeclaration(expression) && types.isVariableDeclarator(expression.declarations[0]) && types.isArrayExpression(expression.declarations[0].init)){
            return expression.declarations[0]
        }
    }
};

function get_while_index(body){
    for(let index in body){
        if(types.isWhileStatement(body[index])) return index;
    }
};


const SwitchReplace =  {
    FunctionDeclaration(path){
        const {id, params, body} = path.node;
        if(!id) return;
        let while_statement = get_while_statement(body.body);
        if(!while_statement) return
        let binding = path.scope.getBinding(id.name);
        let referencePaths = binding.referencePaths;
        let arrexpression = get_while_arr(body.body);
        let switch_body = while_statement.body.body[1];
        let switch_cases = switch_body.cases;
        let switch_test_name = while_statement.body.body[0].expression.right.property.argument.name;
        let out_cases = [];
        for(let reference of referencePaths) {
            if (types.isCallExpression(reference.parent)) {
                    let control_value = reference.parent.arguments[0].value;
                    let switchfix = new nodeMerge.SwitchNodeMerge(arrexpression.init ,switch_body, switch_test_name)
                    let control_body = switchfix.Merge(control_value, []);
                    out_cases.push(types.switchCase(
                        types.NumericLiteral(control_value),
                        control_body
                    )
                    );
            }
            else if(types.isMemberExpression(reference.parent)){
                let control_value = 0;
                let switchfix = new nodeMerge.SwitchNodeMerge(arrexpression.init ,switch_body, switch_test_name)
                let control_body = switchfix.Merge(control_value, []);
                out_cases.push(types.switchCase(
                        types.NumericLiteral(control_value),
                        control_body
                    )
                );
            };
        };
        let while_index = get_while_index(body.body);
        body.body[while_index] = types.switchStatement(params[0],
            out_cases);
    }
};
// traverse(ast_code, SwitchReplace);











//生成新的js code，并保存到文件中输出
let {code} = generator(ast_code);
fs.writeFile(decode_file, code, (err)=>{});
