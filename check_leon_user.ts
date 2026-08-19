import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const u = await adminDb.collection('users').doc('4Ij6CT35R9c5MH2pjw1id2YG3a13').get();
    console.log(`User who picked Leon: ${u.data()?.email} (${u.data()?.displayName || u.data()?.name})`);

    const p = await adminDb.collection('picks').doc('4Ij6CT35R9c5MH2pjw1id2YG3a13_401896651').get();
    console.log(`Pick status: ${p.data()?.status}, Pick: ${JSON.stringify(p.data()?.pick)}`);
}
run().catch(console.error).finally(() => process.exit(0));
