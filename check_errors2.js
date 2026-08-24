import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore("ai-studio-1613b77c-1870-426f-a112-896d5efd5f69");

async function run() {
  const snap = await db.collection('system_errors').orderBy('timestamp', 'desc').limit(5).get();
  console.log(`Found ${snap.size} errors.`);
  snap.docs.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}
run();
