import fs from 'fs';
let code = fs.readFileSync('src/apiRouter.ts', 'utf-8');

const endpointCode = `
apiRouter.get("/link4/picks/:segmentId", async (req, res) => {
  try {
    const { segmentId } = req.params;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection('link4Picks').where('segmentId', '==', segmentId).get();
    const picks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, picks });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

if (!code.includes('/link4/picks/:segmentId')) {
  code = code.replace('export { apiRouter };', endpointCode + '\nexport { apiRouter };');
  fs.writeFileSync('src/apiRouter.ts', code);
}
