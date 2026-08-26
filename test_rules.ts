import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};
const app = initializeApp(firebaseConfig);
import { initializeFirestore } from "firebase/firestore";
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function run() {
  try {
    await addDoc(collection(db, 'system_errors'), {
      context: 'Test Error',
      message: 'This is a test from the script',
      timestamp: serverTimestamp()
    });
    console.log('Success!');
    process.exit(0);
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
