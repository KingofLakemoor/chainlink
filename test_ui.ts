import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb!.collection('link4Matchups').where('segmentId', '==', 'segment_1787759902919').get();
  const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
  
  const allowedSports = ['CFB'];
  const nextPickIndex = 0;
  const picks: any[] = [];

  const availableMatchups = allMatchups.filter((m: any) => {
    if (m.link4Excluded) return false;
    if (allowedSports.length > 0 && !allowedSports.includes(m.league)) return false;
    const statusStr = String(m.status || '');
    if (statusStr !== 'STATUS_SCHEDULED' && statusStr !== 'SCHEDULED') return false;

    if (nextPickIndex > 0 && picks[nextPickIndex - 1]) {
      const prevPick = picks[nextPickIndex - 1];
      if (prevPick?.startTime && m.startTime) {
        const prevTime = typeof prevPick.startTime === 'number' ? prevPick.startTime : new Date(prevPick.startTime).getTime();
        const curTime = typeof m.startTime === 'number' ? m.startTime : new Date(m.startTime).getTime();
        if (!isNaN(prevTime) && !isNaN(curTime) && curTime <= prevTime) {
          return false;
        }
      }
    }
    return true;
  });

  console.log("availableMatchups length:", availableMatchups.length);
}
run();
