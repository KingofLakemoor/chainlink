const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountStr);
} catch (e) {
  serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const bucket = admin.storage().bucket('gen-lang-client-0142543934.firebasestorage.app');
async function run() {
  const [files] = await bucket.getFiles({ prefix: 'contestants/' });
  console.log(files.map(f => f.name).slice(0, 10));
}
run();
