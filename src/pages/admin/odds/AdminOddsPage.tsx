import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { RefreshCw, Sliders, Layers, Zap, CheckCircle2, AlertCircle, Database, Shield } from 'lucide-react';

const ALL_LEAGUES = ["MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA"];

export default function AdminOddsPage() {
  const [maxMoneylineOdds, setMaxMoneylineOdds] = useState<string>('-300');
  const [sportOverrides, setSportOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Manual Odds Sync State
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const handleSaveSettings = async () => {
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
      alert("Odds & scraper settings saved successfully!");
    } catch (e) {
      console.error("Failed to save scraper settings", e);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/sync-odds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sport: selectedSport })
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to sync odds');
      }
      setSyncResult(data);
    } catch (err: any) {
      console.error('Manual odds sync error:', err);
      setSyncError(err.message || 'An error occurred during odds sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading odds management dashboard...</div>;

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Zap className="w-6 h-6 text-cyan-400" />
          Odds & Scraper Management
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure moneyline thresholds, trigger live odds updates across multi-tier providers, and manage sports scraping rules.
        </p>
      </div>

      {/* Manual Odds Sync Card */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Manual Live Odds Update</h2>
            <p className="text-xs text-zinc-400">Instantly pull latest moneyline and spread odds from external providers for active slates.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-zinc-300">Target Sport / League</label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Supported Sports (Tennis & Soccer)</option>
              <option value="tennis">Tennis (ATP & WTA)</option>
              <option value="soccer">Soccer (RPL, TUR, ARG, BRA, LMX)</option>
              <option value="ATP">ATP Tennis Only</option>
              <option value="WTA">WTA Tennis Only</option>
            </select>
          </div>

          <Button
            onClick={handleManualSync}
            disabled={syncing}
            className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 h-10"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Odds...' : 'Run Odds Update'}
          </Button>
        </div>

        {syncResult && (
          <div className="mt-4 p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Odds Sync Completed Successfully
            </div>
            <pre className="text-zinc-300 font-mono bg-zinc-950/60 p-3 rounded border border-zinc-900 overflow-x-auto">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          </div>
        )}

        {syncError && (
          <div className="mt-4 p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-xs flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}
      </div>

      {/* Scraper Thresholds & Overrides Card */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Sliders className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Scraper Odds Thresholds</h2>
            <p className="text-xs text-zinc-400">Games with favorite odds equal to or worse than this threshold will be marked inactive automatically.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Universal Max Moneyline Odds (Favorites)</label>
            <div className="text-xs text-zinc-500 mb-2">
              Any game with favorite odds better than or equal to this number (e.g. -300) will be automatically marked inactive.
            </div>
            <Input
              type="number"
              value={maxMoneylineOdds}
              onChange={(e) => setMaxMoneylineOdds(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white max-w-xs"
              placeholder="-300"
            />
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-200 mb-3 border-b border-zinc-800/80 pb-2">Sport Specific Overrides</h3>
            <div className="text-xs text-zinc-500 mb-4">
              Set specific max odds for individual sports. Leave blank to use the universal setting.
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {ALL_LEAGUES.map(league => (
                <div key={league} className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-zinc-400">{league}</label>
                  <Input
                    type="number"
                    value={sportOverrides[league] || ''}
                    onChange={(e) => setSportOverrides(prev => ({ ...prev, [league]: e.target.value }))}
                    className="bg-zinc-900 border-zinc-800 text-white h-8 text-xs"
                    placeholder="e.g. -200"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
          >
            {saving ? 'Saving Settings...' : 'Save Threshold Settings'}
          </Button>
        </div>
      </div>

      {/* Multi-Tier Provider Pipeline Overview */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Multi-Tier Odds Pipeline Architecture</h2>
            <p className="text-xs text-zinc-400">Order of fallback providers for game moneyline, spread, and totals resolution.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between font-bold text-cyan-400">
              <span className="flex items-center gap-1.5"><Database className="w-4 h-4" /> Tier 1: ESPN API</span>
              <span className="bg-cyan-950 text-cyan-300 text-[10px] px-2 py-0.5 rounded border border-cyan-800">Free / Zero Quota</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Embedded scoreboard lines from DraftKings / ESPN BET. Primary source for major US sports (NFL, NBA, MLB, NHL, CFB, MBB).
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between font-bold text-purple-400">
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Tier 2: The-Odds-API</span>
              <span className="bg-purple-950 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-800">Secondary Fallback</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              DraftKings & FanDuel lines via The-Odds-API. Used for ATP/WTA Tennis, international soccer, and sports lacking ESPN lines.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between font-bold text-amber-400">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Tier 3: SharpAPI / Baseline</span>
              <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800">Tertiary / Baseline</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Tertiary fallback provider when higher tiers return no match, ensuring no game is left without standard line defaults (-110).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
