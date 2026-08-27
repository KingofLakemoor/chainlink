import fs from 'fs';
let code = fs.readFileSync('src/apiRouter.ts', 'utf-8');

const endpointCode = `
apiRouter.get("/link4/matchups/:segmentId", async (req, res) => {
  try {
    const { segmentId } = req.params;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection('link4Matchups').where('segmentId', '==', segmentId).get();
    const matchups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, matchups });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

if (!code.includes('/link4/matchups/:segmentId')) {
  code = code.replace('export { apiRouter };', endpointCode + '\nexport { apiRouter };');
  fs.writeFileSync('src/apiRouter.ts', code);
}
