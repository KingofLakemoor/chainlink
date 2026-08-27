import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: 'chainlink-2-72590',
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};
const app = initializeApp(firebaseConfig);
const dbDefault = initializeFirestore(app, {}, '(default)');

async function run() {
  try {
    const snap = await getDocs(collection(dbDefault, 'link4Matchups'));
    console.log("Client Default DB link4Matchups:", snap.docs.length);
  } catch (e: any) {
    console.error("Client error:", e.message);
  }
  process.exit(0);
}
run();
