const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

code = code.replace(
/const uid = decodedToken\.uid;/g,
`const uid = decodedToken.uid; console.log("Stripe request: ", { itemType, amount, uid });`
);

code = code.replace(
/res\.json\(\{ success: true, id: session\.id, url: session\.url \}\);/g,
`console.log("Stripe session created:", session.id); res.json({ success: true, id: session.id, url: session.url });`
);

fs.writeFileSync('src/apiRouter.ts', code);
