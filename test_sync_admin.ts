import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const segmentId = "segment_1787759902919"; // Assuming this is the Week 0 segment
  const res = await fetch(`http://localhost:3000/api/admin/link4/sync-matchups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-admin' // validateAdmin is mocked to accept anything starting with Bearer? Wait, I don't know. Let's just run the internal logic directly.
    },
    body: JSON.stringify({ segmentId })
  });
}
run();
