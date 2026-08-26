import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'demo-project' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('pickemParticipants').get();
  console.log('Total participants:', snapshot.size);
  let pot = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(data);
    const joinedAt = new Date(data.joinedAt || data.createdAt || Date.now());
    if (joinedAt < new Date('2026-08-31T07:00:00Z')) { // 31st at midnight AZ time (UTC-7)
      pot += 15;
    } else {
      pot += 10;
    }
  });
  console.log('Prize Pot:', pot);
}
run();
