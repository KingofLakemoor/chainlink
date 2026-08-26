import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
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
// NOTE: firebase/firestore JS SDK might need extra steps for databaseId
// If we specify databaseId:
import { initializeFirestore } from "firebase/firestore";
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function run() {
  try {
    const q = query(collection(db, 'link4Matchups'), where('segmentId', '==', 'test_segment'));
    const snap = await getDocs(q);
    console.log('Success, found:', snap.size);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
run();
