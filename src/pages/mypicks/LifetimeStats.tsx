import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { format, subMonths } from 'date-fns';
import { LeagueRadarChart } from '../../components/charts/LeagueRadarChart';
import { LeagueMonthlyPerformanceChart } from '../../components/charts/LeagueMonthlyPerformanceChart';

const leagueIconMap: Record<string, string> = {
  NBA: '🏀',
  MBB: '🏀',
  WBB: '🏀',
  MLB: '⚾',
  NFL: '🏈',
  'COLLEGE-FOOTBALL': '🏈',
  NHL: '🏒',
  EPL: '⚽',
  MLS: '⚽',
  TUR: '⚽',
  RPL: '⚽',
  CSL: '⚽',
  WNBA: '🏀',
  NBASL: '🏀',
  CFL: '🏈',
  LMX: '⚽',
};

interface LifetimeStatsProps {
  userStats: Record<string, { wins: number, losses: number, pushes: number }>;
}

export default function LifetimeStats({ userStats }: LifetimeStatsProps) {
  const { user } = useAuth();
  const [picksWithLeague, setPicksWithLeague] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchPicksAndMatchups = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
           setPicksWithLeague([
             { id: '1', status: 'WIN', updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, league: 'NBA' },
             { id: '2', status: 'LOSS', updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, league: 'NBA' },
             { id: '3', status: 'WIN', updatedAt: Date.now() - 60 * 24 * 60 * 60 * 1000, league: 'NFL' },
             { id: '4', status: 'WIN', updatedAt: Date.now() - 90 * 24 * 60 * 60 * 1000, league: 'MLB' },
             { id: '5', status: 'LOSS', updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, league: 'MLB' },
           ]);
           return;
        }

        const sixMonthsAgo = subMonths(new Date(), 6).getTime();
        const q = query(
          collection(db, 'picks'),
          where('userId', '==', user.uid),
          where('updatedAt', '>=', sixMonthsAgo),
        );
        const snap = await getDocs(q);
        const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));

        // Extract unique matchupIds
        const matchupIdsToFetch = Array.from(new Set(fetchedPicks.map(p => (p as any).matchupId).filter(Boolean)));
        if (matchupIdsToFetch.length === 0) {
          setPicksWithLeague([]);
          return;
        }

        // Chunk into 30s for the 'in' operator
        const chunks = [];
        for (let i = 0; i < matchupIdsToFetch.length; i += 30) {
          chunks.push(matchupIdsToFetch.slice(i, i + 30));
        }

        const fetchedMatchups = [];
        for (const chunk of chunks) {
          const mq = query(collection(db, 'matchups'), where('gameId', 'in', chunk));
          const mSnap = await getDocs(mq);
          mSnap.docs.forEach(d => fetchedMatchups.push({id: d.id, ...d.data()}));
        }

        const picksMapped = fetchedPicks.map((pick: any) => {
          const m = fetchedMatchups.find(m => m.gameId === pick.matchupId);
          return {
             ...pick,
             league: m ? m.league : 'UNKNOWN'
          };
        });

        setPicksWithLeague(picksMapped);
      } catch (e) {
        console.error("Error fetching picks for charts", e);
      }
    };
    fetchPicksAndMatchups();
  }, [user]);

  const leagues = Object.keys(userStats).sort((a, b) => {
    const totalA = (userStats[a].wins || 0) + (userStats[a].losses || 0) + (userStats[a].pushes || 0);
    const totalB = (userStats[b].wins || 0) + (userStats[b].losses || 0) + (userStats[b].pushes || 0);
    return totalB - totalA;
  });

  const leagueChartData = useMemo(() => {
    return Object.keys(userStats).map(league => ({
      league,
      wins: userStats[league].wins || 0,
      losses: userStats[league].losses || 0,
      pushes: userStats[league].pushes || 0,
    }));
  }, [userStats]);

  const leagueMonthlyStats = useMemo(() => {
    if (!picksWithLeague || picksWithLeague.length === 0) return [];

    // Generate the last 6 month keys
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }).reverse();

    const monthlyDataMap: Record<string, Record<string, { totalPicks: number }>> = {};

    last6Months.forEach(monthKey => {
      monthlyDataMap[monthKey] = {};
    });

    picksWithLeague.forEach(pick => {
      if (pick.status === 'PENDING') return;
      const date = new Date(pick.updatedAt || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyDataMap[monthKey]) {
        const league = pick.league || 'UNKNOWN';
        if (!monthlyDataMap[monthKey][league]) {
          monthlyDataMap[monthKey][league] = { totalPicks: 0 };
        }
        monthlyDataMap[monthKey][league].totalPicks += 1;
      }
    });

    return last6Months.map(monthKey => {
      const monthName = format(new Date(`${monthKey}-15`), 'MMM');
      const monthData: any = { month: monthName };
      Object.keys(monthlyDataMap[monthKey]).forEach(league => {
        monthData[league] = monthlyDataMap[monthKey][league];
      });
      return monthData;
    });
  }, [picksWithLeague]);

  if (leagues.length === 0) {
    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 mb-8">
        <p>No lifetime stats available yet. Make some picks!</p>
      </div>
    );
  }

  const totalPicks = leagues.reduce((sum, l) => sum + (userStats[l].wins || 0) + (userStats[l].losses || 0) + (userStats[l].pushes || 0), 0);

  return (
    <div className="flex flex-col gap-8 mb-8">
      {leagueChartData.length > 0 && (
        <LeagueRadarChart leagueData={leagueChartData} />
      )}

      {leagueMonthlyStats.length > 0 && (
        <LeagueMonthlyPerformanceChart leagueMonthlyStats={leagueMonthlyStats} />
      )}

      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 overflow-hidden">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-100 font-display">League Stats Breakdown</h2>
          <p className="text-sm text-zinc-400 mt-1">Breakdown of performance across different leagues ({totalPicks} Total Picks)</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {leagues.map(league => {
            const stats = userStats[league];
            const icon = leagueIconMap[league] || '🏆';

            return (
              <div key={league} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-zinc-800/50 transition-colors">
                <div className="text-4xl mb-4 opacity-90">{icon}</div>
                <div className="text-lg font-bold text-zinc-100 tracking-wide mb-1">
                  {isNaN(stats.wins) ? 0 : stats.wins} - {isNaN(stats.losses) ? 0 : stats.losses} - {isNaN(stats.pushes) ? 0 : stats.pushes}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                  {league}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
