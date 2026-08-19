import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const d1 = await adminDb.collection('matchups').doc('401889761').get();
    console.log(d1.data().title, d1.data().homeScore, d1.data().awayScore, d1.data().winner?.name);
    
    const d2 = await adminDb.collection('matchups').doc('401889775').get();
    console.log(d2.data().title, d2.data().homeScore, d2.data().awayScore, d2.data().winner?.name);
}
run().catch(console.error).finally(() => process.exit(0));
