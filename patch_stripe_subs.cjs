const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

const additionalWebhookHandling = `
  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const uid = subscription.metadata?.uid;
    const itemType = subscription.metadata?.itemType;
    
    if (uid && itemType === 'premium' && adminDb) {
      try {
        const userRef = adminDb.collection('users').doc(uid);
        await adminDb.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) return;
          
          if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            transaction.update(userRef, { premium: false, updatedAt: Date.now() });
          } else if (subscription.status === 'active' || subscription.status === 'trialing') {
             transaction.update(userRef, { premium: true, updatedAt: Date.now() });
          }
        });
      } catch (e) {
        console.error("Error updating user premium status:", e.message);
      }
    }
  }
  res.send();
`;

code = code.replace(
/  res\.send\(\);\n\}\);/,
additionalWebhookHandling + "\n});"
);

fs.writeFileSync('src/apiRouter.ts', code);
