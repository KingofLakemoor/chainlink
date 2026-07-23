const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

const adminLinksRoute = `
apiRouter.post("/admin/update-links", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, amount } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data();
    const currentLinks = userData.links || 0;
    const newLinks = currentLinks + amount;

    await userRef.update({ links: newLinks });

    const logRef = adminDb.collection('linkTransactions').doc();
    await logRef.set({
      userId: targetUserId,
      username: userData.username || userData.name || 'Unknown User',
      type: 'ADMIN_MANUAL',
      amount: amount,
      description: 'Admin explicitly added/removed links',
      createdAt: Date.now()
    });

    res.json({ success: true, newLinks });
  } catch (e: any) {
    console.error("Update links error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

code = code.replace(
  'apiRouter.post("/admin/grade-pickem-matchup"',
  adminLinksRoute + '\napiRouter.post("/admin/grade-pickem-matchup"'
);

fs.writeFileSync('src/apiRouter.ts', code);
