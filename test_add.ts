import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const req = await fetch('http://localhost:3000/api/admin/link4/add-matchups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segmentId: 'segment_1787759902919',
      matchups: [{
        id: 'test_123',
        gameId: '123',
        title: 'Test Game',
        startTime: Date.now(),
        league: 'CFB'
      }]
    })
  });
  console.log(req.status, await req.text());
}
run();
