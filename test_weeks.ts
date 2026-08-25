import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const picksSnap = await adminDb.collection('pickemPicks').get();
  
  let missingWeek = 0;
  picksSnap.docs.forEach(doc => {
      if (doc.data().week === undefined) missingWeek++;
  });

  console.log(`Picks missing week: ${missingWeek}`);
}
run();
