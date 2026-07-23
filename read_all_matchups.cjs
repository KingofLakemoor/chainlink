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
  const scriptless = snap.docs.map(d => d.data()).filter(d => d.featuredType === 'ScriptLess');
  console.log(JSON.stringify(scriptless, null, 2));
}
run();
