const fs = require('fs');
//解析器
const {parse} = require("@babel/parser");
generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
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
        console.log(path.toString());
        //声明控制流开始部分
        if(!path.get("body").get("body")) return;
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
        if(!types.isBreakStatement(consequentPath.node)){
            consequentPath.replaceWith(types.blockStatement([consequentPath.node]));
        }
    },
}
// traverse(ast_code, IfNormal)









//生成新的js code，并保存到文件中输出
let {code} = generator(ast_code);
fs.writeFile(decode_file, code, (err)=>{});