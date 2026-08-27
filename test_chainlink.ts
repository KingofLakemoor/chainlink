import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
const app = initializeApp({ credential: cert(sa), projectId: 'chainlink-2-72590' });
const db = getFirestore(app, 'ai-studio-1613b77c-1870-426f-a112-896d5efd5f69');

async function run() {
  try {
    const snap = await db.collection('link4Matchups').limit(1).get();
    console.log("Success! Docs:", snap.docs.length);
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}
run();
