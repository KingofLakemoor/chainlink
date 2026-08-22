import fs from 'fs';
let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

const target = `  useEffect(() => {
    const unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
      const matchups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllMatchups(matchups);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matchups');
    });`;

const replacement = `  useEffect(() => {
    // Significantly reduce reads by only fetching non-final matches
    const q = query(collection(db, 'matchups'), where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED']));
    const unsubMatchups = onSnapshot(q, (snap) => {
      const matchups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllMatchups(matchups);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matchups');
    });`;

content = content.replace(target, replacement);

const target2 = `  const [isSelectingPick, setIsSelectingPick] = useState(false);
  const [allMatchups, setAllMatchups] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);`;

const replacement2 = `  const [isSelectingPick, setIsSelectingPick] = useState(false);
  const [allMatchups, setAllMatchups] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [fallbackMatchups, setFallbackMatchups] = useState<any[]>([]);`;

content = content.replace(target2, replacement2);

const target3 = `    // Fetch user's picks if they exist`;

const replacement3 = `    // Listen to specific matchups for the user's picks in case they drop from the active query
    let unsubFallbackMatchups = () => {};
    const setupFallbackMatchups = (pickDataPicks: any[]) => {
       const matchupIds = pickDataPicks.map(p => p.id.replace('pick-', '')).filter(Boolean);
       if (matchupIds.length > 0) {
           const fallbackQ = query(collection(db, 'matchups'), where('gameId', 'in', matchupIds));
           unsubFallbackMatchups = onSnapshot(fallbackQ, (snap) => {
               setFallbackMatchups(snap.docs.map(d => ({id: d.id, ...d.data()})));
           });
       } else {
           setFallbackMatchups([]);
       }
    };

    // Fetch user's picks if they exist`;

content = content.replace(target3, replacement3);

const target4 = `             if (data.picks) {
             const userPicks = Array.isArray(data.picks) ? data.picks : Object.values(data.picks);
             
             // Check if segment is finalized (has a payout)
             if (data.payout !== undefined && data.status !== 'PENDING') {
                setIsFinalized(true);
             }
             
             // Pad picks up to 4`;

const replacement4 = `             if (data.picks) {
             const userPicks = Array.isArray(data.picks) ? data.picks : Object.values(data.picks);
             
             setupFallbackMatchups(userPicks);
             
             // Check if segment is finalized (has a payout)
             if (data.payout !== undefined && data.status !== 'PENDING') {
                setIsFinalized(true);
             }
             
             // Pad picks up to 4`;

content = content.replace(target4, replacement4);

const target5 = `      unsubPicks();
    };
  }, [activeSegmentId, allMatchups, user]);`;

const replacement5 = `      unsubPicks();
      if (typeof unsubFallbackMatchups === 'function') unsubFallbackMatchups();
    };
  }, [activeSegmentId, allMatchups, user]);`;

content = content.replace(target5, replacement5);

const target6 = `                    const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));`;

const replacement6 = `                    const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', '')) || fallbackMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));`;

content = content.replace(target6, replacement6); // There are two occurrences of this

const target7 = `              const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));`;

const replacement7 = `              const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', '')) || fallbackMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));`;

content = content.replace(target7, replacement7); // There is one occurrence of this

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);
