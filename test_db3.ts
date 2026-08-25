import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const link4SegmentsSnap = await adminDb.collection('link4Segments').orderBy('endTime', 'desc').limit(10).get();
  link4SegmentsSnap.docs.forEach(doc => {
      const seg = doc.data();
      console.log(seg.id, seg.endTime, seg.allowedSports);
  });
}
run();
