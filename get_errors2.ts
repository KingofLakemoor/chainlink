import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb!.collection('system_errors').orderBy('timestamp', 'desc').limit(5).get();
  snap.docs.forEach(d => console.log(d.id, d.data().message, d.data().timestamp));
}
run();
