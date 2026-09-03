const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Remove the one at the end
content = content.replace('app.get("/api/fix-cfb", async (req, res) => { const snap = await adminDb.collection("pickemCampaigns").get(); let count=0; for (const d of snap.docs) { if (d.data().name && d.data().name.includes("CFB 2026")) { await d.ref.update({isPrivate: false, isOpen: true, isArchived: false, archived: false}); count++; } } res.json({success:true, count}); }); ', '');

// Insert it before app.use('/api', apiRouter);
content = content.replace("app.use('/api', apiRouter);", 
  'app.get("/api/fix-cfb", async (req, res) => { const snap = await adminDb.collection("pickemCampaigns").get(); let count=0; for (const d of snap.docs) { if (d.data().name && d.data().name.includes("CFB 2026")) { await d.ref.update({isPrivate: false, isOpen: true, isArchived: false, archived: false}); count++; } } res.json({success:true, count}); });\n  app.use(\'/api\', apiRouter);'
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts again");
