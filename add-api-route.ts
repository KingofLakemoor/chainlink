import fs from 'fs';
let content = fs.readFileSync('src/apiRouter.ts', 'utf-8');

const route = `
apiRouter.post("/pickem/join", validateToken, async (req, res) => {
  try {
    const { campaignId, joinCode } = req.body;
    if (!campaignId) {
       return res.status(400).json({ success: false, error: "Campaign ID required" });
    }
    
    const uid = req.user.uid;
    
    await adminDb.runTransaction(async (transaction) => {
      const campRef = adminDb.collection("pickemCampaigns").doc(campaignId);
      const campDoc = await transaction.get(campRef);
      
      if (!campDoc.exists) {
         throw new Error("Campaign not found");
      }
      
      const campData = campDoc.data() || {};
      
      if (campData.isPrivate) {
         if ((campData.joinCode || "").toLowerCase().trim() !== (joinCode || "").toLowerCase().trim()) {
            throw new Error("Invalid join code");
         }
      }
      
      const pairId = \`\${campaignId}_\${uid}\`;
      const partRef = adminDb.collection("pickemParticipants").doc(pairId);
      const partDoc = await transaction.get(partRef);
      
      if (partDoc.exists) {
         throw new Error("Already joined this campaign");
      }
      
      const userRef = adminDb.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data() || {};
      
      const entryFee = campData.entryFee || 0;
      const currentLinks = userData.links || 0;
      
      if (entryFee > 0) {
         if (currentLinks < entryFee) {
            throw new Error(\`Not enough links. This campaign requires \${entryFee} links to join.\`);
         }
         transaction.update(userRef, { links: currentLinks - entryFee });
         
         const logRef = adminDb.collection("linkTransactions").doc();
         transaction.set(logRef, {
            userId: uid,
            amount: -entryFee,
            type: 'SPEND',
            description: \`Joined Pick'em Campaign: \${campData.name || campaignId}\`,
            itemId: campaignId,
            createdAt: Date.now()
         });
      }
      
      transaction.set(partRef, {
        campaignId: campaignId,
        participantId: uid,
        joinedAt: Date.now(),
        joinCode: joinCode ? joinCode.trim() : ''
      });
    });
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Join pickem error:", error);
    return res.status(400).json({ success: false, error: error.message || "Failed to join campaign" });
  }
});
`;

content = content.replace("export default apiRouter;", route + "\nexport default apiRouter;");
fs.writeFileSync('src/apiRouter.ts', content);
