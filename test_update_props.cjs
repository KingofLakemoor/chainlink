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

// Mock the admin db so we can just require the propGrader
global.firebaseAdmin = { adminDb: admin.firestore() };

(async () => {
  // Use ts-node to execute the typescript file
})()
