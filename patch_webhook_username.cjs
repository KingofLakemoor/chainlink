const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

code = code.replace(
/const logRef = adminDb\.collection\('linkTransactions'\)\.doc\(\);\n\s*transaction\.set\(logRef, \{\n\s*userId: uid,\n\s*type: 'SHOP_PURCHASE_PACK',/g,
`const logRef = adminDb.collection('linkTransactions').doc();
               transaction.set(logRef, {
                 userId: uid,
                 username: profile.username || profile.name || 'Unknown User',
                 type: 'SHOP_PURCHASE_PACK',`
);

fs.writeFileSync('src/apiRouter.ts', code);
