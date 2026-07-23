import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Button } from "../../../components/ui/button";

export function AdminLeagues() {
  const [leagues, setLeagues] = useState<{ id: string, active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const ALL_LEAGUES = ["PROP", "SCRIPTLESS", "MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"];

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'leagueSettings'));
      const settingsMap = new Map();
      snap.docs.forEach(d => settingsMap.set(d.id, d.data()));

      const formatted = ALL_LEAGUES.map(league => ({
        id: league,
        active: settingsMap.has(league) ? settingsMap.get(league).active : true
      }));

      setLeagues(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  const handleToggle = async (leagueId: string, currentActive: boolean) => {
    try {
      await setDoc(doc(db, 'leagueSettings', leagueId), {
        active: !currentActive,
        updatedAt: Date.now()
      }, { merge: true });

      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, active: !currentActive } : l));
    } catch (e) {
      console.error(e);
      alert("Failed to update league settings.");
    }
  };

  const handleDeactivateScheduled = async (leagueId: string) => {
    if (!confirm(`Are you sure you want to deactivate all SCHEDULED games for ${leagueId}?`)) return;

    try {
      const snap = await getDocs(query(
        collection(db, 'matchups'),
        where('league', '==', leagueId),
        where('status', '==', 'STATUS_SCHEDULED')
      ));

      let batch = writeBatch(db);
      let opCount = 0;

      for (const d of snap.docs) {
        batch.update(doc(db, 'matchups', d.id), { active: false, updatedAt: Date.now() });
        opCount++;

        if (opCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      alert(`Successfully deactivated scheduled games for ${leagueId}.`);
    } catch (e) {
      console.error(e);
      alert(`Failed to deactivate games for ${leagueId}.`);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading leagues...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
        <h3 className="font-bold text-lg">League Settings</h3>
        <Button variant="secondary" size="sm" onClick={fetchLeagues}>Refresh</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">League</th>
              <th className="px-4 py-3 font-medium">Status (Default)</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {leagues.map(l => (
              <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 font-bold text-zinc-300">{l.id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(l.id, l.active)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${l.active ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'}`}
                  >
                    {l.active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => handleDeactivateScheduled(l.id)}>
                    Deactivate Scheduled Games
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}