import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const ALL_LEAGUES = ["MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA"];

export default function ScraperSettingsPage() {
  const [maxMoneylineOdds, setMaxMoneylineOdds] = useState<string>('-300');
  const [sportOverrides, setSportOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'systemSettings', 'scraper');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.maxMoneylineOdds !== undefined) {
            setMaxMoneylineOdds(data.maxMoneylineOdds.toString());
          }
          if (data.sportOverrides) {
            const stringifiedOverrides: Record<string, string> = {};
            for (const [sport, val] of Object.entries(data.sportOverrides)) {
              stringifiedOverrides[sport] = String(val);
            }
            setSportOverrides(stringifiedOverrides);
          }
        }
      } catch (e) {
        console.error("Failed to load scraper settings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed = parseInt(maxMoneylineOdds, 10);
      if (isNaN(parsed)) {
        alert("Please enter a valid number for universal odds");
        setSaving(false);
        return;
      }

      const parsedOverrides: Record<string, number> = {};
      for (const [sport, val] of Object.entries(sportOverrides) as [string, string][]) {
        if (val.trim() === '') continue; // Skip empty overrides
        const parsedVal = parseInt(val, 10);
        if (isNaN(parsedVal)) {
          alert(`Please enter a valid number for ${sport}`);
          setSaving(false);
          return;
        }
        parsedOverrides[sport] = parsedVal;
      }

      await setDoc(doc(db, 'systemSettings', 'scraper'), {
        maxMoneylineOdds: parsed,
        sportOverrides: parsedOverrides,
        updatedAt: Date.now()
      }, { merge: true });
      alert("Settings saved successfully!");
    } catch (e) {
      console.error("Failed to save scraper settings", e);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Scraper Settings</h1>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Max Moneyline Odds (Favorites)</label>
            <div className="text-xs text-zinc-500 mb-2">
              Any game with favorite odds better than or equal to this number (e.g. -300) will be automatically marked inactive.
            </div>
            <Input
              type="number"
              value={maxMoneylineOdds}
              onChange={(e) => setMaxMoneylineOdds(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white"
              placeholder="-300"
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Sport Overrides</h2>
            <div className="text-xs text-zinc-500 mb-4">
              Set specific max odds for individual sports. Leave blank to use the universal setting.
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ALL_LEAGUES.map(league => (
                <div key={league} className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-zinc-400">{league}</label>
                  <Input
                    type="number"
                    value={sportOverrides[league] || ''}
                    onChange={(e) => setSportOverrides(prev => ({ ...prev, [league]: e.target.value }))}
                    className="bg-zinc-900 border-zinc-800 text-white h-8 text-sm"
                    placeholder="e.g. -200"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}