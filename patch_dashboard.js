import fs from 'fs';
let content = fs.readFileSync('src/pages/dashboard/DashboardPage.tsx', 'utf8');

const target1 = `    const unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
      if (snap.empty) {
        setAllFetchedMatchups([]);
      } else {
        const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setAllFetchedMatchups(allMatchups);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matchups');
    });

    return () => {
      unsubMatchups();
    };`;

const replacement1 = `    // Matchups listener removed from here. Handled below based on activePick.
    setIsLoading(false);`;

content = content.replace(target1, replacement1);

const target2 = `  const activePick = picks.find(p => p.status === 'PENDING');
  const activeMatchup = activePick ? allFetchedMatchups.find(m => m.gameId === activePick.matchupId) : null;`;

const replacement2 = `  const activePick = picks.find(p => p.status === 'PENDING');
  
  React.useEffect(() => {
    if (activePick) {
        const q = query(collection(db, 'matchups'), where('gameId', '==', activePick.matchupId));
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                setAllFetchedMatchups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                setAllFetchedMatchups([]);
            }
        });
        return () => unsub();
    } else {
        setAllFetchedMatchups([]);
    }
  }, [activePick]);

  const activeMatchup = activePick ? allFetchedMatchups.find(m => m.gameId === activePick.matchupId) : null;`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/pages/dashboard/DashboardPage.tsx', content);
