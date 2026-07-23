const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const snap = await db.collection('matchups').where('league', '==', 'SCRIPTLESS').get();
  let count = 0;
  let batch = db.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.featured || data.featuredType !== 'yZd7SruYT08dhh6MbVIh') {
       batch.update(doc.ref, { featured: true, featuredType: 'yZd7SruYT08dhh6MbVIh' });
       count++;
    }
  }
  if (count > 0) await batch.commit();
  console.log('Updated', count);
}
run();
