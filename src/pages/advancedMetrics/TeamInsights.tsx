import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Target, Loader2 } from 'lucide-react';
import { FirebaseImage } from '../../components/ui/FirebaseImage';

type TeamStats = {
  id: string;
  name: string;
  image: string;
  count: number;
};

export function TeamInsights() {
  const { user } = useAuth();
  const [mostFrequentWin, setMostFrequentWin] = useState<TeamStats | null>(null);
  const [mostFrequentLoss, setMostFrequentLoss] = useState<TeamStats | null>(null);
  const [mostFrequentOpponentLoss, setMostFrequentOpponentLoss] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchInsights = async () => {
      setLoading(true);
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
           setMostFrequentWin({ id: 't1', name: 'Dev Win Team', image: 'https://via.placeholder.com/150', count: 12 });
           setMostFrequentLoss({ id: 't2', name: 'Dev Loss Team', image: 'https://via.placeholder.com/150', count: 8 });
           setMostFrequentOpponentLoss({ id: 't3', name: 'Dev Kryptonite', image: 'https://via.placeholder.com/150', count: 5 });
           setLoading(false);
           return;
        }

        // 1. Fetch all WIN and LOSS picks for the user (we might need to paginate if they have thousands, but we'll try to fetch enough for a good sample)
        const q = query(
          collection(db, 'picks'),
          where('userId', '==', user.uid),
          where('status', 'in', ['WIN', 'LOSS']),
          orderBy('updatedAt', 'desc'),
          limit(500) // Limit to last 500 for performance, can adjust
        );

        const snap = await getDocs(q);
        const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as any[];

        // 2. Fetch matchups for these picks to get opponent info
        const matchupIdsToFetch = Array.from(new Set(fetchedPicks.map(p => p.matchupId).filter(Boolean)));

        let fetchedMatchups: any[] = [];
        if (matchupIdsToFetch.length > 0) {
            const chunks = [];
            for (let i = 0; i < matchupIdsToFetch.length; i += 30) {
              chunks.push(matchupIdsToFetch.slice(i, i + 30));
            }

            for (const chunk of chunks) {
              const mq = query(collection(db, 'matchups'), where('gameId', 'in', chunk));
              const mSnap = await getDocs(mq);
              mSnap.docs.forEach(d => fetchedMatchups.push({id: d.id, ...d.data()}));
            }
        }

        const winCounts: Record<string, { name: string, image: string, count: number }> = {};
        const lossCounts: Record<string, { name: string, image: string, count: number }> = {};
        const opponentLossCounts: Record<string, { name: string, image: string, count: number }> = {};

        fetchedPicks.forEach(pick => {
           if (!pick.pick || !pick.pick.id) return;

           const teamId = pick.pick.id;
           const teamName = pick.pick.name || 'Unknown';
           const teamImage = pick.pick.image || '';

           if (pick.status === 'WIN') {
               if (!winCounts[teamId]) winCounts[teamId] = { name: teamName, image: teamImage, count: 0 };
               winCounts[teamId].count++;
           } else if (pick.status === 'LOSS') {
               if (!lossCounts[teamId]) lossCounts[teamId] = { name: teamName, image: teamImage, count: 0 };
               lossCounts[teamId].count++;

               // Find opponent
               const matchup = fetchedMatchups.find(m => m.gameId === pick.matchupId);
               if (matchup && matchup.awayTeam && matchup.homeTeam) {
                   let opponentId = null;
                   let opponentName = null;
                   let opponentImage = null;

                   if (teamId === matchup.awayTeam.id) {
                       opponentId = matchup.homeTeam.id;
                       opponentName = matchup.homeTeam.name;
                       opponentImage = matchup.homeTeam.image;
                   } else if (teamId === matchup.homeTeam.id) {
                       opponentId = matchup.awayTeam.id;
                       opponentName = matchup.awayTeam.name;
                       opponentImage = matchup.awayTeam.image;
                   }

                   if (opponentId) {
                       if (!opponentLossCounts[opponentId]) opponentLossCounts[opponentId] = { name: opponentName, image: opponentImage, count: 0 };
                       opponentLossCounts[opponentId].count++;
                   }
               }
           }
        });

        const getTop = (counts: Record<string, any>) => {
            let topId = null;
            let max = 0;
            for (const id in counts) {
                if (counts[id].count > max) {
                    max = counts[id].count;
                    topId = id;
                }
            }
            return topId ? { id: topId, ...counts[topId] } : null;
        };

        setMostFrequentWin(getTop(winCounts));
        setMostFrequentLoss(getTop(lossCounts));
        setMostFrequentOpponentLoss(getTop(opponentLossCounts));

      } catch (e) {
        console.error("Error fetching team insights", e);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  const renderCard = (title: string, icon: React.ReactNode, stat: TeamStats | null, colorClass: string, emptyText: string) => (
    <div className={`bg-[#121212] border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group`}>
      <div className={`absolute top-0 inset-x-0 h-1 ${colorClass}`}></div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
      </div>

      {stat ? (
        <>
          <div className="w-24 h-24 flex items-center justify-center mb-4 bg-zinc-900/50 rounded-full p-4 border border-zinc-800/50">
            <FirebaseImage src={stat.image} fallback="https://via.placeholder.com/150" alt={stat.name} className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="text-xl font-bold text-white mb-1">{stat.name}</div>
          <div className="text-sm font-medium text-zinc-400">
            <span className="text-zinc-300 font-bold">{String(stat.count)}</span> occurrences
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm italic py-8">
          {emptyText}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8 mb-8">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-zinc-100 font-display">Team Insights</h2>
        <p className="text-sm text-zinc-400 mt-1">Deep dive into your betting habits and kryptonites.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderCard(
          "Most Frequent Win",
          <TrendingUp className="w-5 h-5 text-green-500" />,
          mostFrequentWin,
          "bg-green-500",
          "Not enough data to calculate"
        )}

        {renderCard(
          "Most Frequent Loss",
          <TrendingDown className="w-5 h-5 text-red-500" />,
          mostFrequentLoss,
          "bg-red-500",
          "Not enough data to calculate"
        )}

        {renderCard(
          "Kryptonite",
          <Target className="w-5 h-5 text-orange-500" />,
          mostFrequentOpponentLoss,
          "bg-orange-500",
          "Not enough data to calculate"
        )}
      </div>
      <p className="text-xs text-zinc-500 text-center mt-2">
        *Kryptonite: The team you bet against and lose to most often. Based on your recent picks history.
      </p>
    </div>
  );
}
