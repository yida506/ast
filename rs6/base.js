const fs = require('fs');
//解析器
const {parse} = require("@babel/parser");
generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const nodeMerge = require('./NodeMerge');
let encode_file = 'first_page.js',decode_file = 'first_page_decode.js';
let js_code = fs.readFileSync(encode_file, {encoding: "utf-8"});
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
    "WhileStatement|ForStatement"(path) {
        const {body} = path.node;
        if(types.isBlockStatement(body)) return;
        let bodyPath =path.get('body');
        bodyPath.replaceWith(types.BlockStatement([body]));
    }
};

traverse(ast_code, CommaReplace);

const IfChange = {
    IfStatement(path) {
        const {test,consequent,alternate} = path.node;
        if(types.isEmptyStatement(alternate)){
            // console.log(path.toString());
            let alternatePath = path.get('alternate');
            alternatePath.replaceWith(types.BlockStatement([]));
        }
    }
};
traverse(ast_code, IfChange);




// 控制流流程还原
const ArrReplace = {
    CallExpression(path){
        const {callee, arguments} = path.node;
        if(!types.isFunctionExpression(callee)) return;
        if(callee.id !== null) return;
        let arrname = callee.params[1];
        let arrnodevalue = arguments[1];
        let binding = path.get('callee').scope.getBinding(arrname.name);
        let references = binding.referencePaths;
        for(let reference of references){
            let arrindex = reference.parent.property.value;
            reference.parentPath.replaceWith(arrnodevalue.elements[arrindex]);
        }
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
        fullNode[currentvalue] = consequentNode.body[0];
    };
    // console.log(generator(alternateNode).code, 'else --->',!types.isIfStatement(alternateNode)  && (types.isBlockStatement(alternateNode) || (!types.isIfStatement(alternateNode.body[0]) && !types.isBinaryExpression(alternateNode.body[0].test))));
    if(!types.isIfStatement(alternateNode)
        && !(types.isIfStatement(alternateNode.body[0]) && types.isBinaryExpression(alternateNode.body[0].test))
    ){
        fullNode[currentvalue+1] = alternateNode.body[0];
    }
}

var fullNode = {};
// if表达式转switch_case
const If2Switch = {
    WhileStatement(path){
        const {test, body} = path.node;
        // console.log(body.body.length);
        //声明控制流开始部分
        if(body.body.length <= 1) return;
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

// 三目表达式还原为if
const ConditionNormal = {
    ConditionalExpression(path) {
        let {test, consequent, alternate} = path.node;
        if(!types.isUnaryExpression(test)) return;
        // console.log(path.toString());
        path.insertBefore(
            types.ifStatement(test,
                types.blockStatement([types.ExpressionStatement(consequent)]),
                null)
        )
        path.remove()

    }
};
traverse(ast_code, ConditionNormal);




//if表达式规范化
const IfNormal = {
    IfStatement(path){
        let consequentPath = path.get('consequent');
        if(!types.isblockStatement(consequentPath.node)){
            consequentPath.replaceWith(types.blockStatement([consequentPath.node]));
        }
    },
}
// traverse(ast_code, IfNormal)

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
        if(types.isExpressionStatement(body.body[0])) return;
        let while_statement = get_while_statement(body.body);
        if(!while_statement) return
        let binding = path.scope.getBinding(id.name);
        let referencePaths = binding.referencePaths;
        let arrexpression = get_while_arr(body.body);
        let switch_body = while_statement.body.body[1];
        if(!switch_body) return;
        let switch_cases = switch_body.cases;
        let switch_test_name = while_statement.body.body[0].expression.right.property.argument.name;
        let out_cases = [];
        for(let reference of referencePaths) {
            if (types.isCallExpression(reference.parent)) {
                let control_value = reference.parent.arguments[0].value;
                let switchfix = new nodeMerge.SwitchNodeMerge(arrexpression.init ,switch_body, switch_test_name)
                let control_body = switchfix.Merge(control_value, []);
                let now_switch_case = types.switchCase(
                    types.NumericLiteral(control_value),
                    control_body
                );
                out_cases.push(now_switch_case);
            }
            else if(types.isMemberExpression(reference.parent)){
                let control_value = 0;
                let switchfix = new nodeMerge.SwitchNodeMerge(arrexpression.init ,switch_body, switch_test_name)
                let control_body = switchfix.Merge(control_value, []);
                let now_switch_case = types.switchCase(
                    types.NumericLiteral(control_value),
                    control_body
                )
                out_cases.push(now_switch_case);
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