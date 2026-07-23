const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

code = code.replace(
/console\.error\("Create checkout session error:", e\.message, e\);/g,
`console.error("Create checkout session error:", e.message, e);
    require('fs').appendFileSync('stripe-errors.log', new Date().toISOString() + " - " + e.message + "\\n");`
);

fs.writeFileSync('src/apiRouter.ts', code);
