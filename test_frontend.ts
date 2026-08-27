import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function run() {
  try {
    const snap = await getDocs(collection(db, 'link4Segments'));
    console.log("Success! Docs:", snap.docs.length);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
