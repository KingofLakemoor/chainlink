import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const segmentId = "segment_1787759902919"; 
  const segmentDoc = await adminDb!.collection('link4Segments').doc(segmentId).get();
  if (!segmentDoc.exists) return;
  const segment = segmentDoc.data()!;
  const filterBegin = segment.startTime ? new Date(segment.startTime).getTime() : 0;
  const filterEnd = segment.endTime ? new Date(segment.endTime).getTime() : 0;

  const snap = await adminDb!.collection('link4Matchups').where('segmentId', '==', segmentId).get();
  let deleted = 0;
  const batch = adminDb!.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    const validStartTime = typeof data.startTime === 'number' ? data.startTime : (data.startTime ? new Date(data.startTime).getTime() : 0);
    
    if (validStartTime < filterBegin || validStartTime > filterEnd) {
      batch.delete(doc.ref);
      deleted++;
    }
  }
  if (deleted > 0) {
    await batch.commit();
    console.log(`Deleted ${deleted} out-of-bounds games for segment ${segmentId}`);
  } else {
    console.log("No out-of-bounds games found");
  }
}
run().catch(console.error);
