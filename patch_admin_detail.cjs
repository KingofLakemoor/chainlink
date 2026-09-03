const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      const q = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', id),
        where('week', '==', week)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));`;

const replacement = `      const q = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', id)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => m.week === week);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched");
} else {
    console.error("Not found");
}
