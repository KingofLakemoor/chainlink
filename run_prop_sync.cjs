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
  const { updateAllProps } = await import('./dist/server.cjs'); // wait, the built server?
  // Actually, I can just use tsx to run it directly
}
run();
