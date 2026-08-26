import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
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
    const snap = await getDocs(collection(db, 'system_errors'));
    snap.docs.forEach(d => {
       console.log("===", d.data().context, "===");
       console.log(d.data().message);
       console.log("-------------------");
    });
    console.log('Done!');
    process.exit(0);
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
