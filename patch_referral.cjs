const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

const route = `
apiRouter.post("/referral/increment", validateAuth, async (req, res) => {
  try {
    const { referrerId } = req.body;
    if (!referrerId || !adminDb) return res.json({ success: false });

    const referrerRef = adminDb.collection('users').doc(referrerId);
    await adminDb.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(referrerRef);
      if (!doc.exists) return;
      const data = doc.data();
      const currentLinks = data.links || 0;
      const currentCount = data.referralsCount || 0;
      
      transaction.update(referrerRef, {
        links: currentLinks + 50,
        referralsCount: currentCount + 1
      });

      const logRef = adminDb.collection('linkTransactions').doc();
      transaction.set(logRef, {
        userId: referrerId,
        username: data.username || data.name || 'Unknown',
        type: 'REFERRAL_BONUS',
        amount: 50,
        description: \`Bonus for referring a new user\`,
        createdAt: Date.now()
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Referral increment error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

code = code.replace(
  'apiRouter.get("/users/check-username"',
  route + '\napiRouter.get("/users/check-username"'
);

fs.writeFileSync('src/apiRouter.ts', code);
