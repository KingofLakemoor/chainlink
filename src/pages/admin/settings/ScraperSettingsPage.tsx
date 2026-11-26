import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const ALL_LEAGUES = ["MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA"];

export default function ScraperSettingsPage() {
  const [maxMoneylineOdds, setMaxMoneylineOdds] = useState<string>('-450');
  const [atsMoneylineOdds, setAtsMoneylineOdds] = useState<string>('-250');
  const [maxPointSpread, setMaxPointSpread] = useState<string>('9.5');
  const [sportOverrides, setSportOverrides] = useState<Record<string, string>>({});
  const [sportOddsRules, setSportOddsRules] = useState<Record<string, { maxMoneylineOdds?: string; atsMoneylineOdds?: string; maxPointSpread?: string }>>({});
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
          if (data.atsMoneylineOdds !== undefined) {
            setAtsMoneylineOdds(data.atsMoneylineOdds.toString());
          }
          if (data.maxPointSpread !== undefined) {
            setMaxPointSpread(data.maxPointSpread.toString());
          }
          if (data.sportOverrides) {
            const stringifiedOverrides: Record<string, string> = {};
            for (const [sport, val] of Object.entries(data.sportOverrides)) {
              stringifiedOverrides[sport] = String(val);
            }
            setSportOverrides(stringifiedOverrides);
          }
          if (data.sportOddsRules) {
            const stringifiedRules: Record<string, { maxMoneylineOdds?: string; atsMoneylineOdds?: string; maxPointSpread?: string }> = {};
            for (const [sport, rule] of Object.entries(data.sportOddsRules as Record<string, any>)) {
              stringifiedRules[sport] = {
                maxMoneylineOdds: rule.maxMoneylineOdds !== undefined ? String(rule.maxMoneylineOdds) : '',
                atsMoneylineOdds: rule.atsMoneylineOdds !== undefined ? String(rule.atsMoneylineOdds) : '',
                maxPointSpread: rule.maxPointSpread !== undefined ? String(rule.maxPointSpread) : ''
              };
            }
            setSportOddsRules(stringifiedRules);
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
      const parsedMaxML = parseInt(maxMoneylineOdds, 10);
      if (isNaN(parsedMaxML)) {
        alert("Please enter a valid number for universal max odds");
        setSaving(false);
        return;
      }

      const parsedAtsML = parseInt(atsMoneylineOdds, 10);
      if (isNaN(parsedAtsML)) {
        alert("Please enter a valid number for universal ATS switch odds");
        setSaving(false);
        return;
      }

      const parsedMaxSpread = parseFloat(maxPointSpread);
      if (isNaN(parsedMaxSpread) || parsedMaxSpread <= 0) {
        alert("Please enter a valid positive number for max point spread (e.g. 9.5)");
        setSaving(false);
        return;
      }

      const parsedOverrides: Record<string, number> = {};
      const parsedRules: Record<string, { maxMoneylineOdds?: number; atsMoneylineOdds?: number; maxPointSpread?: number }> = {};

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

      for (const [sport, rule] of Object.entries(sportOddsRules)) {
        const sportRule: { maxMoneylineOdds?: number; atsMoneylineOdds?: number; maxPointSpread?: number } = {};
        if (rule.maxMoneylineOdds && rule.maxMoneylineOdds.trim() !== '') {
          const val = parseInt(rule.maxMoneylineOdds, 10);
          if (!isNaN(val)) sportRule.maxMoneylineOdds = val;
        }
        if (rule.atsMoneylineOdds && rule.atsMoneylineOdds.trim() !== '') {
          const val = parseInt(rule.atsMoneylineOdds, 10);
          if (!isNaN(val)) sportRule.atsMoneylineOdds = val;
        }
        if (rule.maxPointSpread && rule.maxPointSpread.trim() !== '') {
          const val = parseFloat(rule.maxPointSpread);
          if (!isNaN(val) && val > 0) sportRule.maxPointSpread = val;
        }
        if (Object.keys(sportRule).length > 0) {
          parsedRules[sport] = sportRule;
        }
      }

      await setDoc(doc(db, 'systemSettings', 'scraper'), {
        maxMoneylineOdds: parsedMaxML,
        atsMoneylineOdds: parsedAtsML,
        maxPointSpread: parsedMaxSpread,
        sportOverrides: parsedOverrides,
        sportOddsRules: parsedRules,
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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Scraper & Odds Thresholds</h1>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        {/* Universal Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              ATS Switch Threshold (Start ATS)
            </label>
            <div className="text-[11px] text-zinc-500 mb-2">
              Favorites at or steeper than this (e.g. -250) switch to Against The Spread (ATS).
            </div>
            <Input
              type="number"
              value={atsMoneylineOdds}
              onChange={(e) => setAtsMoneylineOdds(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white"
              placeholder="-250"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Max Moneyline Odds (Off Board)
            </label>
            <div className="text-[11px] text-zinc-500 mb-2">
              Favorites steeper than this (e.g. -450) are removed from the board entirely.
            </div>
            <Input
              type="number"
              value={maxMoneylineOdds}
              onChange={(e) => setMaxMoneylineOdds(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white"
              placeholder="-450"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Max Point Spread Cap
            </label>
            <div className="text-[11px] text-zinc-500 mb-2">
              ATS is only allowed if spread is &le; this value (e.g. 9.5).
            </div>
            <Input
              type="number"
              step="0.5"
              value={maxPointSpread}
              onChange={(e) => setMaxPointSpread(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white"
              placeholder="9.5"
            />
          </div>
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-lg text-xs text-cyan-300/90 leading-relaxed">
          <strong>How It Works:</strong> Games milder than <code className="text-white font-mono">{atsMoneylineOdds || '-250'}</code> stay on the board as standard Moneyline. Games between <code className="text-white font-mono">{atsMoneylineOdds || '-250'}</code> and <code className="text-white font-mono">{maxMoneylineOdds || '-450'}</code> automatically switch to <strong>ATS (point spread)</strong> if spread &le; <code className="text-white font-mono">{maxPointSpread || '9.5'}</code>. Games steeper than <code className="text-white font-mono">{maxMoneylineOdds || '-450'}</code> are deactivated.
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-200 mb-2 border-b border-zinc-800 pb-2">Sport Specific Overrides</h2>
          <div className="text-xs text-zinc-500 mb-4">
            Override thresholds per league. Leave blank to use universal defaults.
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-2.5 px-3">League</th>
                  <th className="py-2.5 px-3">Switch to ATS Odds</th>
                  <th className="py-2.5 px-3">Max ML Odds (Off Board)</th>
                  <th className="py-2.5 px-3">Max Spread Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {ALL_LEAGUES.map(league => {
                  const rule = sportOddsRules[league] || {};
                  const isSpreadSport = ['NFL', 'CFB', 'NBA', 'MBB', 'WBB'].includes(league);
                  return (
                    <tr key={league} className="hover:bg-zinc-900/40">
                      <td className="py-2 px-3 font-semibold text-zinc-200 flex items-center gap-1.5">
                        {league}
                        {isSpreadSport && (
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                            Spread
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={rule.atsMoneylineOdds || ''}
                          onChange={(e) => setSportOddsRules(prev => ({
                            ...prev,
                            [league]: { ...(prev[league] || {}), atsMoneylineOdds: e.target.value }
                          }))}
                          className="bg-zinc-900 border-zinc-800 text-white h-7 text-xs w-28"
                          placeholder={atsMoneylineOdds || '-250'}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={rule.maxMoneylineOdds || sportOverrides[league] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSportOverrides(prev => ({ ...prev, [league]: val }));
                            setSportOddsRules(prev => ({
                              ...prev,
                              [league]: { ...(prev[league] || {}), maxMoneylineOdds: val }
                            }));
                          }}
                          className="bg-zinc-900 border-zinc-800 text-white h-7 text-xs w-28"
                          placeholder={maxMoneylineOdds || '-450'}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          step="0.5"
                          value={rule.maxPointSpread || ''}
                          onChange={(e) => setSportOddsRules(prev => ({
                            ...prev,
                            [league]: { ...(prev[league] || {}), maxPointSpread: e.target.value }
                          }))}
                          className="bg-zinc-900 border-zinc-800 text-white h-7 text-xs w-28"
                          placeholder={maxPointSpread || '9.5'}
                          disabled={!isSpreadSport}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}