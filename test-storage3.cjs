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
const bucket = admin.storage().bucket('chainlink-2-72590.appspot.com');
async function run() {
  const [files] = await bucket.getFiles({ prefix: 'contestants/' });
  console.log(files.map(f => f.name).slice(0, 10));
}
run();
