import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/link4/Link4AdminPage.tsx', 'utf8');

const oldSync = `      // 1. Get all picked matchups to exclude them from updates
      const picksSnap = await getDocs(collection(db, 'link4Picks'));
      const pickedGameIds = new Set<string>();
      picksSnap.docs.forEach(d => {
         const data = d.data();
         const picks = Array.isArray(data.picks) ? data.picks : (data.picks ? Object.values(data.picks) : []);
         picks.forEach((p: any) => {
            if (p?.matchupId) {
               pickedGameIds.add(p.matchupId);
            } else if (p?.id && p.id.startsWith('pick-')) {
               pickedGameIds.add(p.id.replace('pick-', ''));
            }
         });
      });`;

const newSync = `      // 1. Get recent picked matchups to exclude them from updates (bounded to avoid downloading the whole database)
      const picksSnap = await getDocs(query(collection(db, 'link4Picks'), orderBy('createdAt', 'desc'), limit(1000)));
      const pickedGameIds = new Set<string>();
      picksSnap.docs.forEach(d => {
         const data = d.data();
         const picks = Array.isArray(data.picks) ? data.picks : (data.picks ? Object.values(data.picks) : []);
         picks.forEach((p: any) => {
            if (p?.matchupId) {
               pickedGameIds.add(p.matchupId);
            } else if (p?.id && p.id.startsWith('pick-')) {
               pickedGameIds.add(p.id.replace('pick-', ''));
            }
         });
      });`;

if (content.includes("const picksSnap = await getDocs(collection(db, 'link4Picks'));")) {
    content = content.replace(oldSync, newSync);
    fs.writeFileSync('src/pages/admin/link4/Link4AdminPage.tsx', content);
    console.log("Patched Link4AdminPage.tsx");
} else {
    console.log("Not found or already patched");
}
