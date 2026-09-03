const fs = require('fs');

// pickemReminders.ts
let file1 = 'src/services/pickemReminders.ts';
let content1 = fs.readFileSync(file1, 'utf8');

const t1_1 = `         const matchupsSnap = await adminDb.collection('pickemMatchups')
            .where('campaignId', '==', campaignDoc.id)
            .where('week', '==', campaign.currentWeek)
            .get();`;

const r1_1 = `         const matchupsSnap = await adminDb.collection('pickemMatchups')
            .where('campaignId', '==', campaignDoc.id)
            .get();
         const matchupDocs = matchupsSnap.docs.filter(d => d.data().week === campaign.currentWeek);`;

if (content1.includes(t1_1)) {
    content1 = content1.replace(t1_1, r1_1);
    content1 = content1.replace(/matchupsSnap\.empty/g, '(matchupDocs.length === 0)');
    content1 = content1.replace(/matchupsSnap\.docs\.forEach/g, 'matchupDocs.forEach');
}

const t1_2 = `            const picksSnap = await adminDb.collection('pickemPicks')
               .where('campaignId', '==', campaignDoc.id)
               .where('week', '==', campaign.currentWeek)
               .get();`;

const r1_2 = `            const picksSnap = await adminDb.collection('pickemPicks')
               .where('campaignId', '==', campaignDoc.id)
               .get();
            const pickDocs = picksSnap.docs.filter(d => d.data().week === campaign.currentWeek);`;

if (content1.includes(t1_2)) {
    content1 = content1.replace(t1_2, r1_2);
    content1 = content1.replace(/picksSnap\.docs\.forEach/g, 'pickDocs.forEach');
}
fs.writeFileSync(file1, content1);
console.log("Patched pickemReminders");

// pickemEnforcer.ts
let file2 = 'src/services/pickemEnforcer.ts';
let content2 = fs.readFileSync(file2, 'utf8');

const t2 = `         const picksSnap = await adminDb.collection('pickemPicks')
            .where('campaignId', '==', campaignDoc.id)
            .where('week', '==', campaign.currentWeek)
            .get();

         if (picksSnap.empty) continue;

         // Group picks by participantId
         const picksByParticipant = new Map<string, any[]>();
         for (const pDoc of picksSnap.docs) {`;

const r2 = `         const picksSnap = await adminDb.collection('pickemPicks')
            .where('campaignId', '==', campaignDoc.id)
            .get();
         
         const pickDocs = picksSnap.docs.filter(d => d.data().week === campaign.currentWeek);
         if (pickDocs.length === 0) continue;

         // Group picks by participantId
         const picksByParticipant = new Map<string, any[]>();
         for (const pDoc of pickDocs) {`;

if (content2.includes(t2)) {
    content2 = content2.replace(t2, r2);
    fs.writeFileSync(file2, content2);
    console.log("Patched pickemEnforcer");
} else {
    console.error("Not found in pickemEnforcer");
}

