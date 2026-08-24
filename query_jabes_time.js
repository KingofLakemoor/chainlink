import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();
let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({ credential: cert(serviceAccount) });
} else {
    app = initializeApp();
}
const db = getFirestore();

async function run() {
  const userId = 'FfrwlXCeo0Rel50m6ax3uIVTBDf1';
  const pickId = 'FfrwlXCeo0Rel50m6ax3uIVTBDf1_1075-2026_184594';
  const pickDoc = await db.collection('picks').doc(pickId).get();
  
  if (pickDoc.exists) {
    const pick = pickDoc.data();
    console.log("Pick created at:", new Date(pick.createdAt).toISOString());
    console.log("Pick submitted at:", new Date(pick.timestamp || pick.createdAt).toISOString());
  }
}
run().catch(console.error);
