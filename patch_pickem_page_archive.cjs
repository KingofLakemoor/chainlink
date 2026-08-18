const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `      try {
        const snap = await getDocs(collection(db, 'pickemCampaigns'));
        const camps = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));`;

const repl = `      try {
        const snap = await getDocs(collection(db, 'pickemCampaigns'));
        const camps = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(c => !c.isArchived);`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched PickEmPage!");
} else {
  console.log("Could not find target in PickEmPage.");
}
