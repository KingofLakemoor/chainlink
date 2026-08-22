import fs from 'fs';
let content = fs.readFileSync('src/pages/play/PlayDashboard.tsx', 'utf8');

const target = `    const setupMatchups = () => {
      unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
        if (snap.empty) {
          setAllFetchedMatchups([]);
        } else {
          const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setAllFetchedMatchups(allMatchups);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'matchups');
      });
    };`;

const replacement = `    const setupMatchups = () => {
      // Significantly reduce reads by only fetching non-final matches
      const q = query(collection(db, 'matchups'), where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED']));
      unsubMatchups = onSnapshot(q, (snap) => {
        if (snap.empty) {
          setAllFetchedMatchups([]);
        } else {
          const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setAllFetchedMatchups(allMatchups);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'matchups');
      });
    };`;

content = content.replace(target, replacement);

const target2 = `  const activePick: any = activePicks[0];
  const queuedPick: any = activePicks[1];
  const activeMatchup = activePick ? allFetchedMatchups.find(m => m.gameId === activePick.matchupId) : null;`;

const replacement2 = `  const activePick: any = activePicks[0];
  const queuedPick: any = activePicks[1];
  
  // We need to ensure we have the matchup for the active pick, even if it dropped from the real-time query above (e.g. became STATUS_FINAL before the backend resolved the pick)
  const [fallbackActiveMatchup, setFallbackActiveMatchup] = useState<any>(null);
  
  useEffect(() => {
     if (activePick) {
         // if it's already in allFetchedMatchups, we don't strictly need to fetch it, but just in case it drops:
         const unsub = onSnapshot(doc(db, 'matchups', activePick.matchupId), (docSnap) => {
             if (docSnap.exists()) {
                 setFallbackActiveMatchup({ id: docSnap.id, ...docSnap.data() });
             }
         });
         return () => unsub();
     } else {
         setFallbackActiveMatchup(null);
     }
  }, [activePick?.matchupId]);

  const activeMatchup = activePick ? (allFetchedMatchups.find(m => m.gameId === activePick.matchupId) || fallbackActiveMatchup) : null;`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/pages/play/PlayDashboard.tsx', content);
