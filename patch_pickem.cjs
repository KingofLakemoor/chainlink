const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `      const mQuery = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', campaignId),
        where('week', '==', week)
      );
      const mSnap = await getDocs(mQuery);
      setMatchups(mSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.startTime - b.startTime));

      if (user) {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', campaignId),
          where('week', '==', week),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);
        const picksMap: Record<string, any> = {};
        pSnap.docs.forEach(d => {
          const data = d.data();
          picksMap[data.matchupId] = { id: d.id, ...data };
        });
        setUserPicks(picksMap);
      }`;

const replacement1 = `      const mQuery = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', campaignId)
      );
      const mSnap = await getDocs(mQuery);
      setMatchups(mSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => m.week === week).sort((a: any, b: any) => a.startTime - b.startTime));

      if (user) {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);
        const picksMap: Record<string, any> = {};
        pSnap.docs.forEach(d => {
          const data = d.data();
          if (data.campaignId === campaignId && data.week === week) {
             picksMap[data.matchupId] = { id: d.id, ...data };
          }
        });
        setUserPicks(picksMap);
      }`;

const target2 = `        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', selectedCampaign.id),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);`;

const replacement2 = `        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);`;

const target3 = `        pSnap.docs.forEach(d => {
          const data = d.data();
          if (data.week !== selectedWeek && data.pick?.teamId) {
            used.add(data.pick.teamId);
          }`;

const replacement3 = `        pSnap.docs.forEach(d => {
          const data = d.data();
          if (data.campaignId !== selectedCampaign.id) return;
          if (data.week !== selectedWeek && data.pick?.teamId) {
            used.add(data.pick.teamId);
          }`;


if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    console.log("Patched 1");
}
if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    console.log("Patched 2");
}
if (content.includes(target3)) {
    content = content.replace(target3, replacement3);
    console.log("Patched 3");
}

fs.writeFileSync(file, content);
