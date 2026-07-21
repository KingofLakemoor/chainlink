import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  
  const usersSnap = await adminDb.collection('users').where('referralGranted', '==', true).get();
  
  let count = 0;
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.referralGrantedAt && data.referralGrantedAt >= startOfMonth) {
      count++;
    } else if (data.createdAt && data.createdAt >= startOfMonth) {
      count++;
    }
  });
  
  await adminDb.collection('settings').doc(`monthlyStats_${currentMonthStr}`).set({ referrals: count }, { merge: true });
  console.log("Backfilled referrals count to:", count);
}
run();
