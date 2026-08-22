import fs from 'fs';
let content = fs.readFileSync('src/pages/mypicks/MyPicksPage.tsx', 'utf8');

const targetStart = "    let unsubMatchups = () => {};";
const targetEnd = "  }, [user]);";

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Target not found");
    process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex + targetEnd.length);

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
    
    fetchMatchupsForPicks();
    
    const pendingPicks = picks.filter(p => p.status === 'PENDING');
    const pendingIds = Array.from(new Set(pendingPicks.map(p => p.matchupId))).filter(Boolean);
    let unsub = () => {};
    
    if (pendingIds.length > 0) {
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
    };`;

fs.writeFileSync('src/pages/mypicks/MyPicksPage.tsx', before + replacement + after);
