const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

code = code.replace(
/const uid = decodedToken\.uid; console\.log\("Stripe request: ", \{ itemType, amount, uid \}\);\n    console\.log\("Stripe request: ", \{ itemType, amount, uid \}\);/g,
'const uid = decodedToken.uid;'
);
// Also it might just be:
code = code.replace(
/const uid = decodedToken\.uid; console\.log\("Stripe request: ", \{ itemType, amount, uid \}\);/g,
'const uid = decodedToken.uid;'
);

fs.writeFileSync('src/apiRouter.ts', code);
