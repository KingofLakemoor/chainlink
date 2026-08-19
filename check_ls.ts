import 'dotenv/config';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

async function run() {
    const snap = await db.collection('leagueSettings').get();
    snap.docs.forEach(d => {
        console.log(d.id, d.data().active);
    });
}
run();
