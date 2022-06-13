const fs = require('fs');
let page1_code = fs.readFileSync("first_page.js", {encoding: "utf-8"});
let page2_decode = fs.readFileSync("html_decode.js", {encoding: "utf-8"});
eval(page1_code);
eval(page2_decode);