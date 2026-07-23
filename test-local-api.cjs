const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccount = serviceAccountStr.startsWith('{') ? JSON.parse(serviceAccountStr) : JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
async function run() {
  const token = await admin.auth().createCustomToken('test_uid');
  // wait, custom tokens can't be used for verifyIdToken!
  // Instead, let's just bypass verifyIdToken in a local copy of the route!
}
