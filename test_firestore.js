import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const docRef = await addDoc(collection(db, 'system_errors'), {
      context: 'Test',
      message: 'This is a test error',
      timestamp: serverTimestamp()
    });
    console.log("Success:", docRef.id);
  } catch(e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
test();
