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
  const snap = await db.collection('matchups').get();
  const all = snap.docs.map(d => d.data());
  const scriptless = all.filter(d => d.league === 'SCRIPTLESS' || d.league === 'PROJECT_RUNWAY' || d.featuredType === 'yZd7SruYT08dhh6MbVIh' || d.featuredType === 'ScriptLess');
  console.log(scriptless);
}
run();
