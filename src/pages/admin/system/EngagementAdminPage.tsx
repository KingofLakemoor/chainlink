import React, { useState } from 'react';
import { collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Activity, Trophy } from 'lucide-react';

export default function EngagementAdminPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const calculateLifetimeRecords = async () => {
    if (!window.confirm("Run lifetime records calculation for all users? This might take a while.")) return;
    
    setLoading(true);
    setLogs([]);
    addLog("Starting lifetime records calculation...");

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      addLog(`Found ${users.length} users. Proceeding to calculate stats...`);

      let processed = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      const picksSnap = await getDocs(query(collection(db, 'pickemPicks'), where('status', 'in', ['WIN', 'LOSS', 'PUSH'])));
      addLog(`Fetched ${picksSnap.size} graded pickem picks.`);

      const userStats: Record<string, { wins: number, losses: number, pushes: number }> = {};
      
      picksSnap.forEach(d => {
        const p = d.data();
        const uid = p.participantId;
        if (!uid) return;
        if (!userStats[uid]) {
          userStats[uid] = { wins: 0, losses: 0, pushes: 0 };
        }
        if (p.status === 'WIN') userStats[uid].wins += 1;
        else if (p.status === 'LOSS') userStats[uid].losses += 1;
        else if (p.status === 'PUSH') userStats[uid].pushes += 1;
      });

      for (const user of users) {
        const stats = userStats[user.id] || { wins: 0, losses: 0, pushes: 0 };
        const total = stats.wins + stats.losses + stats.pushes;
        const winPct = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : "0.0";

        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, {
          lifetimeStats: {
            pickem: {
              wins: stats.wins,
              losses: stats.losses,
              pushes: stats.pushes,
              winPercentage: Number(winPct),
              totalPicks: total,
              lastCalculated: Date.now()
            }
          }
        });

        batchCount++;
        processed++;

        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
          addLog(`Processed ${processed} users...`);
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      addLog(`Finished calculating lifetime records for ${processed} users.`);
    } catch (e: any) {
      console.error(e);
      addLog(`Error: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const seedSpecialTitles = async () => {
    if (!window.confirm("Seed special contest titles into the database (this is a conceptual step for now)?")) return;
    setLoading(true);
    setLogs([]);
    addLog("Seeding special titles is not implemented via DB yet, as cosmetics are in shop_items.json.");
    addLog("You can manually add these to shop_items.json:");
    addLog(`
      {
        "id": "title_pickem_champ",
        "name": "Pick'em Champion",
        "description": "Winner of a massive Pick'em Campaign.",
        "cost": 0,
        "type": "TITLE",
        "active": true,
        "forSale": false,
        "image": "PickemChampTitle",
        "featured": false,
        "preview": "PickemChampTitle",
        "order": 1,
        "collectionId": "special"
      }
    `);
    addLog("Once added to shop_items.json, you can use the 'User Cosmetics' page to assign them to winners.");
    setLoading(false);
  };

  return (
    <div className="p-6 bg-[#121212] border border-zinc-800 rounded-xl max-w-4xl mx-auto text-white space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Engagement & Records Admin</h2>
        <p className="text-zinc-400">
          Tools to build and manage long-term engagement features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#18181a] p-4 border border-zinc-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">Lifetime Records</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Aggregates historical picks and calculates lifetime wins, losses, pushes, and win percentage.
          </p>
          <Button onClick={calculateLifetimeRecords} disabled={loading} className="w-full">
            Calculate Lifetime Records
          </Button>
        </div>

        <div className="bg-[#18181a] p-4 border border-zinc-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold">Special Titles</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Titles for winners of large contests.
          </p>
          <Button onClick={seedSpecialTitles} disabled={loading} variant="secondary" className="w-full">
            View Special Title Info
          </Button>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-black border border-zinc-800 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className="mb-1 text-zinc-300">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
