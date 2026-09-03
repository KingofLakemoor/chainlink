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
      
      const pickCounts: Record<string, number> = {};
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

const target2 = `                  <td className="px-4 py-3 text-zinc-500">{new Date(row.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono">-</td>
                  <td className="px-4 py-3 text-right">`;

const replacement2 = `                  <td className="px-4 py-3 text-zinc-500">{new Date(row.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-300 font-mono font-bold">
                    {row.pickCount > 0 ? (
                        <span className="text-cyan-400">{row.pickCount}</span>
                    ) : (
                        <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    console.log('Replaced fetchData');
} else {
    console.error('Failed to find target1');
}

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    console.log('Replaced table cells');
} else {
    console.error('Failed to find target2');
}

fs.writeFileSync(file, content);
