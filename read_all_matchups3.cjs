const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
async function run() {
  const snap = await db.collection('matchups').where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS']).get();
  const all = snap.docs.map(d => ({id: d.id, league: d.data().league, featured: d.data().featured, title: d.data().title}));
  console.log(all);
}
run();
