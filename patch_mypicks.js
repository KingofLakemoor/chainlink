import fs from 'fs';
let content = fs.readFileSync('src/pages/mypicks/MyPicksPage.tsx', 'utf8');

const target = `    let unsubMatchups = () => {};
    if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
         setMatchups([
            {
                id: 'mock-1',
                gameId: 'mock-1',
                title: 'Phillies @ Braves',
                league: 'MLB',
                status: 'STATUS_FINAL',
                startTime: Date.now() - 22 * 60 * 60 * 1000,
                statusDesc: 'Final',
                cost: 0,
                awayTeam: { id: 'teamA', name: 'Phillies', image: 'https://via.placeholder.com/150', score: 5 },
                homeTeam: { id: 'teamB', name: 'Braves', image: 'https://via.placeholder.com/150', score: 2 }
            },
            {
                id: 'mock-2',
                gameId: 'mock-2',
                title: 'Spartak Moscow @ Dynamo Moscow',
                league: 'RPL',
                status: 'STATUS_IN_PROGRESS',
                startTime: Date.now() - 2 * 60 * 60 * 1000,
                statusDesc: '2nd Half',
                cost: 0,
                awayTeam: { id: 'teamC', name: 'Spartak Moscow', image: 'https://via.placeholder.com/150', score: 1 },
                homeTeam: { id: 'teamD', name: 'Dynamo Moscow', image: 'https://via.placeholder.com/150', score: 1 }
            },
            {
                id: 'mock-3',
                gameId: 'mock-3',
                title: 'Team E @ Cubs',
                league: 'MLB',
                status: 'STATUS_FINAL',
                startTime: Date.now() - 17 * 60 * 60 * 1000,
                statusDesc: 'Final',
                cost: 0,
                homeTeam: { id: 'teamE', name: 'Team E', image: 'https://via.placeholder.com/150' },
                awayTeam: { id: 'teamF', name: 'Cubs', image: 'https://via.placeholder.com/150' }
            }
         ]);
    } else {
        unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
          if (!snap.empty) {
             const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
             setMatchups(allMatchups);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'matchups');
        });
    }

    return () => {
      unsubMatchups();
    };
  }, [user]);`;

const replacement = `  }, [user]);

  React.useEffect(() => {
    if (!picks.length) return;
    if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) return;

    let isMounted = true;
    const fetchMatchupsForPicks = async () => {
        try {
            const uniqueMatchupIds = Array.from(new Set(picks.map(p => p.matchupId))).filter(Boolean);
            const fetchedMatchups = [];
            for (let i = 0; i < uniqueMatchupIds.length; i += 30) {
                const chunk = uniqueMatchupIds.slice(i, i + 30);
                const q = query(collection(db, 'matchups'), where('gameId', 'in', chunk));
                const snap = await getDocs(q);
                fetchedMatchups.push(...snap.docs.map(d => ({id: d.id, ...d.data()})));
            }
            if (isMounted) setMatchups(fetchedMatchups);
        } catch (e) {
            console.error("Failed to fetch matchups for picks:", e);
        }
    };
    
    // Fetch static data for all picks
    fetchMatchupsForPicks();
    
    // Add real-time listener ONLY for pending picks
    const pendingPicks = picks.filter(p => p.status === 'PENDING');
    const pendingIds = Array.from(new Set(pendingPicks.map(p => p.matchupId))).filter(Boolean);
    let unsub = () => {};
    
    if (pendingIds.length > 0) {
        // Assume pending picks won't exceed 30 unique matchups at a time
        const q = query(collection(db, 'matchups'), where('gameId', 'in', pendingIds.slice(0, 30)));
        unsub = onSnapshot(q, (snap) => {
            if (!snap.empty && isMounted) {
                const updatedMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
                setMatchups(prev => {
                    const newMatchups = [...prev];
                    updatedMatchups.forEach(um => {
                        const idx = newMatchups.findIndex(m => m.gameId === um.gameId);
                        if (idx >= 0) newMatchups[idx] = um;
                        else newMatchups.push(um);
                    });
                    return newMatchups;
                });
            }
        });
    }

    return () => {
        isMounted = false;
        unsub();
    };
  }, [picks]);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/mypicks/MyPicksPage.tsx', content);
