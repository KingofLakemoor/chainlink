import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
    const snap = await db.collection('pickemMatchups').get();
    snap.docs.forEach(d => {
        const data = d.data();
        if (data.title && (data.title.includes("Santiago") || data.title.includes("Leon"))) {
            console.log(d.id, data.title, data.gameId, data.status, data.statusDesc);
        }
    });
}
run();
