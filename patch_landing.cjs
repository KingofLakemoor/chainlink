const fs = require('fs');
const file = 'src/pages/pickem/PickEmLandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `
          const mQuery = query(collection(db, 'pickemMatchups'), where('campaignId', '==', cid), where('week', '==', camp.currentWeek ?? 1));
          const pQuery = query(collection(db, 'pickemPicks'), where('campaignId', '==', cid), where('week', '==', camp.currentWeek ?? 1), where('participantId', '==', user.uid));

          const [mSnap, pSnap] = await Promise.all([getDocs(mQuery), getDocs(pQuery)]);

          const matchups = mSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a, b) => a.startTime - b.startTime);
          const picks = pSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));`;

const replacement = `
          const mQuery = query(collection(db, 'pickemMatchups'), where('campaignId', '==', cid));
          const pQuery = query(collection(db, 'pickemPicks'), where('participantId', '==', user.uid));

          const [mSnap, pSnap] = await Promise.all([getDocs(mQuery), getDocs(pQuery)]);

          const week = camp.currentWeek ?? 1;
          const matchups = mSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter(m => m.week === week).sort((a, b) => a.startTime - b.startTime);
          const picks = pSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter(p => p.campaignId === cid && p.week === week);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched");
} else {
    console.error("Not found");
}
