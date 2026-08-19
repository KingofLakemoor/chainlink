import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    console.log(`kingoflakemoor id: ${userSnap.docs[0].id}`);
    
    const u1 = await adminDb.collection('users').doc('VSkYRk2C8AcVezUZ3MMf0QP1a1n1').get();
    console.log(`User 1 email: ${u1.data()?.email}`);

    const u2 = await adminDb.collection('users').doc('oAehm3hCCqRaimY14fQ0B7yuzYP2').get();
    console.log(`User 2 email: ${u2.data()?.email}`);
}
run().catch(console.error).finally(() => process.exit(0));
