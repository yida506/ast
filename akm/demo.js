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
K妹akm
 */

const StrReplace = {
    StringLiteral(path){
       path.node.extra = null;

    },
};

traverse(ast_code, StrReplace)

const ArrReplace = {
    VariableDeclarator(path){
        const {id, init} = path.node;
        if(id.name !== "_acxj") return;
        // console.log(path.toString())
        let binding = path.scope.getBinding(id.name);
        let references = binding.referencePaths;
        // console.log(references.length)
        for(let reference of references){
            let num = reference.parent.property.value;
            reference.parentPath.replaceWith(init.elements[num])
        }
    }
};

traverse(ast_code, ArrReplace)







//生成新的js code，并保存到文件中输出
let {code} = generator(ast_code);
fs.writeFile(decode_file, code, (err)=>{});