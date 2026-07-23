const fs = require('fs');
const content = fs.readFileSync('src/apiRouter.ts', 'utf8');
const block = content.substring(content.indexOf('apiRouter.post("/admin/sync-schedules"'), content.indexOf('apiRouter.post("/shop/buy"'));
console.log(block);
