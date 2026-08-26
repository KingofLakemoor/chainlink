import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, initializeFirestore } from "firebase/firestore";
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
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function run() {
  try {
    const q = query(collection(db, 'link4Matchups'), where('segmentId', '==', 'test_segment'));
    const snap = await getDocs(q);
    console.log('Success, found:', snap.size);
    process.exit(0);
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
