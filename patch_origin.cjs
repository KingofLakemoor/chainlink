const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

code = code.replace(
/success_url: \`\$\{req\.headers\.origin\}\/shop\?success=true\`,/g,
"success_url: `${req.headers.origin || (req.protocol + '://' + req.get('host'))}/shop?success=true`,"
);
code = code.replace(
/cancel_url: \`\$\{req\.headers\.origin\}\/shop\?canceled=true\`,/g,
"cancel_url: `${req.headers.origin || (req.protocol + '://' + req.get('host'))}/shop?canceled=true`,"
);

fs.writeFileSync('src/apiRouter.ts', code);
