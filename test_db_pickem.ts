import 'dotenv/config';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

async function run() {
    const adminDb = getFirestore();
    const snap = await adminDb.collection('pickemMatchups').get();
    let found = false;
    snap.docs.forEach(d => {
        const data = d.data();
        if (data.title && (data.title.includes("Santiago") || data.title.includes("Leon"))) {
            console.log(d.id, "=> gameId:", data.gameId, "status:", data.status, "statusDesc:", data.statusDesc);
            found = true;
        }
    });
    if(!found) console.log("Not found in pickemMatchups");
}
run();
