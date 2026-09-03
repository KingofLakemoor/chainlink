const fs = require('fs');
let content = fs.readFileSync('src/apiRouter.ts', 'utf8');
content = content.replace(
  'apiRouter.get("/fix-cfb", async (req, res) => { const snap = await adminDb.collection("pickemCampaigns").get(); let count=0; for (const d of snap.docs) { if (d.data().name && d.data().name.includes("CFB 2026")) { await d.ref.update({isPrivate: false, isOpen: true, isArchived: false, archived: false}); count++; } } res.json({success:true, count}); });\n',
  ''
);
fs.writeFileSync('src/apiRouter.ts', content);
console.log("Reverted src/apiRouter.ts");
