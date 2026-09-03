const fs = require('fs');
const file = '/app/applet/src/pages/admin/matchups/AdminMatchups.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'matchups'), where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED'])));
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`;

const replacement1 = `  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'matchups'), where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED'])));
      
      const picksSnap = await getDocs(query(collection(db, 'picks'), where('status', '==', 'PENDING')));
      const pickemSnap = await getDocs(query(collection(db, 'pickemPicks'), where('status', '==', 'PENDING')));
      
      const pickCounts = {};
      picksSnap.forEach(d => {
         const matchId = d.data().matchupId;
         pickCounts[matchId] = (pickCounts[matchId] || 0) + 1;
      });
      pickemSnap.forEach(d => {
         const matchId = d.data().matchupId;
         pickCounts[matchId] = (pickCounts[matchId] || 0) + 1;
      });

      setData(snap.docs.map(d => ({ id: d.id, ...d.data(), pickCount: pickCounts[d.id] || 0 })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`;

if (content.indexOf("setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));") !== -1) {
    const startIndex = content.indexOf("const fetchData = async () => {");
    const endIndex = content.indexOf("};", startIndex) + 2;
    content = content.substring(0, startIndex) + replacement1 + content.substring(endIndex);
    console.log("Replaced");
} else {
    console.error("Not found");
}

fs.writeFileSync(file, content);
