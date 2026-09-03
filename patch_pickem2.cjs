const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              const pCheckQuery = query(
                collection(db, 'pickemPicks'),
                where('campaignId', '==', initialCampaign.id),
                where('participantId', '==', user.uid),
                limit(1)
              );
              const pCheckSnap = await getDocs(pCheckQuery);
              userIsParticipant = !pCheckSnap.empty;`;

const replacement = `              const pCheckQuery = query(
                collection(db, 'pickemPicks'),
                where('participantId', '==', user.uid)
              );
              const pCheckSnap = await getDocs(pCheckQuery);
              userIsParticipant = pCheckSnap.docs.some(d => d.data().campaignId === initialCampaign.id);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched 4");
} else {
    console.error("Not found");
}
