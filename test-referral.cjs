const admin = require('firebase-admin');

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccount = serviceAccountStr.startsWith('{') ? JSON.parse(serviceAccountStr) : JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function run() {
  const db = admin.firestore();
  // find a user to be the referrer
  const users = await db.collection('users').limit(1).get();
  if (users.empty) return console.log("No users");
  const referrerId = users.docs[0].id;
  console.log("Found referrer:", referrerId);
  
  // mock the API request logic
  const referrerRef = db.collection('users').doc(referrerId);
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(referrerRef);
    if (!doc.exists) return;
    const data = doc.data();
    const currentLinks = data.links || 0;
    const currentCount = data.referralsCount || 0;
    
    transaction.update(referrerRef, {
      links: currentLinks + 50,
      referralsCount: currentCount + 1
    });

    const logRef = db.collection('linkTransactions').doc();
    transaction.set(logRef, {
      userId: referrerId,
      username: data.username || data.name || 'Unknown',
      type: 'REFERRAL_BONUS',
      amount: 50,
      description: `Bonus for referring a new user`,
      createdAt: Date.now()
    });
  });
  console.log("Transaction complete");
}
run();
