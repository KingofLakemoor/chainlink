import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trophy, Medal, Star } from 'lucide-react';
import { FirebaseImage } from '../../components/ui/FirebaseImage';

export default function HallOfFamePage() {
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), orderBy('lifetimeStats.pickem.wins', 'desc'), limit(100))
        );
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTopUsers(users);
      } catch (err) {
        console.error("Failed to load hall of fame", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopUsers();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 mb-4 tracking-tight">
          HALL OF FAME
        </h1>
        <p className="text-zinc-400 text-lg">
          Lifetime records and legendary achievements.
        </p>
      </div>

      <div className="bg-[#121212] border border-yellow-900/30 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 bg-[#18181A] flex justify-between text-sm font-bold text-zinc-500 uppercase tracking-wider">
          <div className="w-16 text-center">Rank</div>
          <div className="flex-1 pl-4">Player</div>
          <div className="w-24 text-center">Wins</div>
          <div className="w-24 text-center hidden sm:block">Total Picks</div>
          <div className="w-24 text-center">Win %</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 animate-pulse">Loading legends...</div>
        ) : topUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No lifetime records found.</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {topUsers.map((user, idx) => {
              const rank = idx + 1;
              const stats = user.lifetimeStats?.pickem;
              const wins = stats?.wins || 0;
              const total = stats?.totalPicks || 0;
              const pct = stats?.winPercentage || 0;

              return (
                <div key={user.id} className="flex items-center p-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="w-16 flex justify-center">
                    {rank === 1 ? <Trophy className="w-6 h-6 text-yellow-400" /> :
                     rank === 2 ? <Medal className="w-6 h-6 text-zinc-300" /> :
                     rank === 3 ? <Medal className="w-6 h-6 text-amber-600" /> :
                     <span className="text-zinc-500 font-bold text-lg">{rank}</span>}
                  </div>
                  
                  <div className="flex-1 pl-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative border border-zinc-700">
                      {user.photoURL ? (
                        <FirebaseImage src={user.photoURL} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                          {(user.displayName || user.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-100 text-lg">
                        {user.displayName || user.username || 'Unknown'}
                      </div>
                      {user.equippedCosmetics?.TITLE && (
                         <div className="text-xs font-semibold text-yellow-500/80 uppercase tracking-wide">
                           Special Title Holder
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="w-24 text-center font-black text-xl text-zinc-200">
                    {wins}
                  </div>
                  
                  <div className="w-24 text-center font-bold text-zinc-500 hidden sm:block text-lg">
                    {total}
                  </div>

                  <div className="w-24 text-center font-bold text-blue-400 text-lg">
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
