import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf-8');

const targetContent = `    let pot = 0;
    try {
      const snapshot = await adminDb.collection('pickemParticipants').get();
      snapshot.forEach(doc => {
        const data = doc.data();
        const joinedAt = new Date(data.joinedAt || data.createdAt || Date.now());
        // August 31, 2026 midnight AZ time is 2026-08-31T07:00:00Z
        if (joinedAt < new Date('2026-08-31T07:00:00Z')) {
          pot += 15;
        } else {
          pot += 10;
        }
      });
    } catch (e) {
      console.error('Failed to calculate pot', e);
    }`;

const replacementContent = `    let pot = 0;
    try {
      const campaignSnap = await adminDb.collection('pickemCampaigns').where('name', '==', 'YES Day Walk for Autism 2026').limit(1).get();
      if (!campaignSnap.empty) {
        const campaignId = campaignSnap.docs[0].id;
        const snapshot = await adminDb.collection('pickemParticipants').where('campaignId', '==', campaignId).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          const joinedAt = new Date(data.joinedAt || data.createdAt || Date.now());
          // August 31, 2026 midnight AZ time is 2026-08-31T07:00:00Z
          if (joinedAt < new Date('2026-08-31T07:00:00Z')) {
            pot += 15;
          } else {
            pot += 10;
          }
        });
      }
    } catch (e) {
      console.error('Failed to calculate pot', e);
    }`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('src/apiRouter.ts', content);
