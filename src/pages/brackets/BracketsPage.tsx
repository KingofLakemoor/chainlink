import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Loader2, Layers } from 'lucide-react';
import { WorldCupBracket } from './WorldCupBracket';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';

const getTeamAbbreviation = (team: string) => {
  if (!team) return "";
  const specialCases: Record<string, string> = {
    "United States": "USA",
    "United Kingdom": "UK",
    "South Korea": "KOR",
    "North Korea": "PRK",
    "Saudi Arabia": "KSA",
    "Costa Rica": "CRC",
    "New Zealand": "NZL",
    "South Africa": "RSA",
  };
  return specialCases[team] || team.substring(0, 3).toUpperCase();
};

export function BracketsPage() {
  const { bracketId } = useParams<{ bracketId: string }>();
  const { user } = useAuth();
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bracket' | 'leaderboard'>('bracket');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const isBracketLocked = new Date() > new Date('2026-07-04T17:00:00Z');

  useEffect(() => {
    async function fetchBracket() {
      if (!db) return;
                const defaultTeams = [
          "Canada", "Morocco",
          "Paraguay", "France",
          "Brazil", "Norway",
          "Mexico", "England",
          "Portugal", "Spain",
          "United States", "Belgium",
          "Argentina", "Egypt",
          "Switzerland", "Colombia"
        ];


                // Create matchTimes for default bracket to prevent everything from locking instantly if not seeded
        const matchTimes: Record<string, string> = {
          'r0-m0': '2026-07-04T17:00:00.000Z',
          'r0-m1': '2026-07-04T21:00:00.000Z',
          'r0-m2': '2026-07-05T20:00:00.000Z',
          'r0-m3': '2026-07-06T00:00:00.000Z',
          'r0-m4': '2026-07-06T19:00:00.000Z',
          'r0-m5': '2026-07-07T00:00:00.000Z',
          'r0-m6': '2026-07-07T16:00:00.000Z',
          'r0-m7': '2026-07-07T20:00:00.000Z'
        };

        const matchIds: Record<string, string> = {
          'r0-m0': '760502',
          'r0-m1': '760503',
          'r0-m2': '760504',
          'r0-m3': '760505',
          'r0-m4': '760506',
          'r0-m5': '760507',
          'r0-m6': '760509',
          'r0-m7': '760508'
        };

        const defaultBracket = {
          id: 'world-cup-2026',
          name: "2026 World Cup Bracket",
          sport: "World Cup 2026",
          teams: defaultTeams,
          matchTimes,
          matchIds,

          pointValues: {
            "Round of 16": 20,
            "Quarter Finals": 40,
            "Semi Finals": 80,
            "Finals": 160
          },
          cost: 10,
          prizePotPercent: 0.60,
          theme: bracketId === 'charity' ? {
            title: "Charity Cup 2026",
            subtitle: "Make your picks to support a great cause!",
            primaryColor: "#3b82f6",
            logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=charity"
          } : undefined
        };

      try {
        let targetBracketId = bracketId || 'world-cup-2026';
        if (targetBracketId === '8YdIvl2U0TRKOGKJkYC9') targetBracketId = 'world-cup-2026';
        const docRef = doc(db, 'brackets', targetBracketId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBracket({
            ...defaultBracket,
            id: docSnap.id,
            ...data,
            // Fallback to default teams/matchTimes if missing in the db document
            teams: data.teams && data.teams.length > 0 ? data.teams : defaultBracket.teams,
            matchTimes: data.matchTimes && Object.keys(data.matchTimes).length > 0 ? data.matchTimes : defaultBracket.matchTimes,
            matchIds: data.matchIds && Object.keys(data.matchIds).length > 0 ? data.matchIds : defaultBracket.matchIds,
            pointValues: data.pointValues && Object.keys(data.pointValues).length > 0 ? data.pointValues : defaultBracket.pointValues,
          });
        } else {
          setBracket({ ...defaultBracket, id: targetBracketId });
        }
      } catch (error) {
        setBracket(defaultBracket);
        console.error("Error fetching bracket:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBracket();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!db || !bracket || activeTab !== 'leaderboard') return;
      setLeaderboardLoading(true);
      try {
        const pQuery = query(
          collection(db, 'bracketGamePredictions'),
          where('bracketId', '==', bracket.id)
        );
        const pSnap = await getDocs(pQuery);

        const participantStats: Record<string, { points: number, potentialPoints: number, uid: string, finalFour?: string[], champion?: string }> = {};

        const pointsMap: Record<string, number> = {
          "0": bracket.pointValues?.["Round of 16"] || 20,
          "1": bracket.pointValues?.["Quarter Finals"] || 40,
          "2": bracket.pointValues?.["Semi Finals"] || 80,
          "3": bracket.pointValues?.["Finals"] || 160
        };

        const results = bracket.results || {};
        const explicitlyEliminated = bracket.eliminatedTeams || [];

        pSnap.docs.forEach(d => {
          const data = d.data();
          let pts = 0;
          let pot = 0;
          const sels = data.selections || {};
          for (const [mId, pickedTeam] of Object.entries(sels)) {
             const round = mId.split('-')[0].replace('r', '');
             const rPts = pointsMap[round] || 0;
             if (results[mId] === pickedTeam) {
                pts += rPts;
                pot += rPts;
             } else if (results[mId] && results[mId] !== pickedTeam) {
                // picked wrong, no points, no potential
             } else if (!results[mId] && !explicitlyEliminated.includes(pickedTeam)) {
                // still alive
                pot += rPts;
             }
          }
          const uid = data.userId || d.id.split('_')[1];
          const finalFour = [
            sels['r1-m0'],
            sels['r1-m1'],
            sels['r1-m2'],
            sels['r1-m3']
          ].filter(Boolean) as string[];
          const champion = sels['r3-m0'];

          if (uid) {
            participantStats[uid] = { points: pts, potentialPoints: pot, uid, finalFour, champion };
          }
        });

        const participantIds = Object.keys(participantStats);

        if (participantIds.length > 0) {
          const token = await user?.getIdToken();

          let usersMap: Record<string, any> = {};

          const chunkedUids = [];
          for (let i = 0; i < participantIds.length; i += 50) {
            chunkedUids.push(participantIds.slice(i, i + 50));
          }

          await Promise.all(chunkedUids.map(async (chunk) => {
            const res = await fetch(`/api/users/public?uids=${chunk.join(',')}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              const usersList = data.users || [];
              usersList.forEach((u: any) => { usersMap[u.id] = u; });
            }
          }));


          const formattedLeaderboard = participantIds.map(uid => ({
             uid,
             name: usersMap[uid]?.username || usersMap[uid]?.displayName || 'Unknown User',
             avatar: usersMap[uid]?.image || usersMap[uid]?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
             ...participantStats[uid]
          })).sort((a, b) => b.points !== a.points ? b.points - a.points : b.potentialPoints - a.potentialPoints);

          setLeaderboardData(formattedLeaderboard);
        } else {
          setLeaderboardData([]);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
  }, [bracket, activeTab, user]);

  const theme = bracket?.theme || {};
  const primaryColor = theme.primaryColor || "#22c55e";
  const title = theme.title || "Brackets";
  const subtitle = theme.subtitle;

  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt={title} className="w-10 h-10 object-contain" loading="lazy" />
          ) : (
            <Trophy className="w-8 h-8" style={{ color: primaryColor }} />
          )}
          {title}
        </h1>
        {subtitle && <p className="text-zinc-400 text-lg">{subtitle}</p>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : bracket ? (
        <div className="w-full">
          <div className="mb-6 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">{bracket.name}</h2>
              <span className="text-sm text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full whitespace-nowrap hidden md:inline-block">
                Points per round: {Object.values(bracket.pointValues).join(' / ')}
              </span>
            </div>

            <div className="flex bg-[#121212] p-1 rounded-xl border border-zinc-800 self-start">
              <button
                onClick={() => setActiveTab('bracket')}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'bracket'
                    ? 'text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                style={activeTab === 'bracket' ? { backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}33` } : undefined}
              >
                <Layers className="w-4 h-4" />
                Bracket
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'leaderboard'
                    ? 'text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                style={activeTab === 'leaderboard' ? { backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}33` } : undefined}
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </button>
            </div>
          </div>

          {activeTab === 'bracket' && <WorldCupBracket bracket={bracket} />}

          {activeTab === 'leaderboard' && (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden max-w-7xl mx-auto">
              {bracket?.cost !== undefined && (
                <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center px-6">
                  <div className="text-zinc-400 font-medium uppercase text-sm tracking-wider">Prize Pot (1st Place)</div>
                  <div className="text-2xl font-black text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    {Math.floor((bracket.totalPot ?? (leaderboardData.length * (bracket.cost ?? 10))) * (bracket.prizePotPercent ?? 0.60))} <span className="text-sm font-medium text-zinc-500">Links</span>
                  </div>
                </div>
              )}
              {leaderboardLoading ? (
                <div className="p-12 text-center text-zinc-500 font-medium flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: primaryColor }} />
                  Loading leaderboard...
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-medium">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                  No one has entered this bracket yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                        <th className="px-6 py-4 font-medium">Participant</th>
                        <th className="px-6 py-4 font-medium text-center">Final Four</th>
                        <th className="px-6 py-4 font-medium text-center">Points</th>
                        <th className="px-6 py-4 font-medium text-center">Potential</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {leaderboardData.map((participant, index) => {
                        const actualR1Winners = [
                          bracket?.results?.['r1-m0'],
                          bracket?.results?.['r1-m1'],
                          bracket?.results?.['r1-m2'],
                          bracket?.results?.['r1-m3']
                        ].filter(Boolean) as string[];

                        return (
                        <tr
                          key={participant.uid}
                          className={`hover:bg-zinc-800/20 transition-colors`}
                          style={participant.uid === user?.uid ? { backgroundColor: `${primaryColor}1A` } : undefined}
                        >
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                              index === 1 ? 'bg-zinc-300/20 text-zinc-300' :
                              index === 2 ? 'bg-orange-500/20 text-orange-500' :
                              'text-zinc-500'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={participant.avatar} alt="" className="w-8 h-8 rounded-full bg-zinc-800" />
                              <span className={`font-medium ${participant.uid === user?.uid ? 'text-white' : 'text-zinc-300'}`}>
                                {participant.name}
                              </span>
                              {participant.uid === user?.uid && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">You</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!isBracketLocked ? (
                              <span className="text-xs font-bold text-zinc-500 italic">Picks are In</span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                {participant.finalFour?.map((team: string, i: number) => {
                                  const isEliminated = bracket?.eliminatedTeams?.includes(team);
                                  const isActualFinalFour = actualR1Winners.includes(team);
                                  const isChampion = team === participant.champion;

                                  let className = "text-[10px] font-bold px-1.5 py-0.5 rounded-sm ";

                                  if (isChampion) {
                                    className += "border border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)] ";
                                  } else {
                                    className += "border border-transparent ";
                                  }

                                  if (isActualFinalFour) {
                                    className += "text-green-500 ";
                                  } else if (isEliminated) {
                                    className += "text-red-500 line-through opacity-80 ";
                                  } else {
                                    className += "text-zinc-400 ";
                                  }

                                  return (
                                    <span key={i} className={className} title={team}>
                                      {getTeamAbbreviation(team)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-white">
                            {isNaN(participant.points) ? 0 : participant.points}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-zinc-400">
                            {isNaN(participant.potentialPoints) ? 0 : participant.potentialPoints}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center max-w-7xl mx-auto">
          <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            We are currently building the brackets feature. The first supported event will be the 2026 FIFA World Cup. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}
