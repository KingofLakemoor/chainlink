import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { clearCached } from '../../../lib/firestore-cache';
import { Button } from '../../../components/ui/button';
import { RefreshCw, Save, CheckCircle2 } from 'lucide-react';

export default function PrizeAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forceUpdating, setForceUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [prizeData, setPrizeData] = useState({
    activeUsersRequirement: 25,
    picksRequirement: 375,
    referralsRequirement: 0,
    prizeDescription: '$5 Club 602 gift card',
    sponsorName: 'Club 602',
    targetMonth: new Date().toISOString().slice(0, 7), // Format YYYY-MM
    winCondition: 'Current Chain'
  });

  useEffect(() => {
    const fetchPrize = async () => {
      try {
        const docRef = doc(db, 'settings', 'monthlyPrize');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrizeData(docSnap.data() as any);
        }
      } catch (err) {
        console.error("Failed to load prize settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrize();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const updatedData = { ...prizeData, updatedAt: Date.now() };
      await setDoc(doc(db, 'settings', 'monthlyPrize'), updatedData);
      clearCached('sidebar_monthly_stats');
      window.dispatchEvent(new Event('monthly-prize-updated'));
      setStatusMessage("Saved successfully and sidebar cache cleared!");
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleForceUpdate = async () => {
    setForceUpdating(true);
    setStatusMessage(null);
    try {
      const updatedData = { ...prizeData, updatedAt: Date.now() };
      await setDoc(doc(db, 'settings', 'monthlyPrize'), updatedData);
      clearCached('sidebar_monthly_stats');
      window.dispatchEvent(new Event('monthly-prize-updated'));
      setStatusMessage("Monthly prize card force updated! Sidebar refreshed immediately.");
    } catch (err) {
      console.error("Force update failed", err);
      alert("Failed to force update.");
    } finally {
      setForceUpdating(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl max-w-xl">
      <h2 className="text-2xl font-bold mb-6">Monthly Prize & Sponsor Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Active Users Requirement</label>
          <input
            type="number"
            value={prizeData.activeUsersRequirement}
            onChange={(e) => setPrizeData({...prizeData, activeUsersRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Global Picks Requirement</label>
          <input
            type="number"
            value={prizeData.picksRequirement}
            onChange={(e) => setPrizeData({...prizeData, picksRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Referrals Requirement (0 to disable)</label>
          <input
            type="number"
            value={prizeData.referralsRequirement || 0}
            onChange={(e) => setPrizeData({...prizeData, referralsRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>



        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Prize Description</label>
          <input
            type="text"
            value={prizeData.prizeDescription}
            onChange={(e) => setPrizeData({...prizeData, prizeDescription: e.target.value})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Sponsor Name</label>
          <input
            type="text"
            value={prizeData.sponsorName}
            onChange={(e) => setPrizeData({...prizeData, sponsorName: e.target.value})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Win Condition</label>
          <select
            value={prizeData.winCondition || 'Current Chain'}
            onChange={(e) => setPrizeData({...prizeData, winCondition: e.target.value})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          >
            <option value="Current Chain">Current Chain</option>
            <option value="Longest Chain">Longest Chain</option>
            <option value="Most Wins">Most Wins</option>
            <option value="Highest Win Percentage">Highest Win Percentage</option>
            <option value="Most Referrals">Most Referrals</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Target Month</label>
          <input
            type="month"
            value={prizeData.targetMonth}
            onChange={(e) => setPrizeData({...prizeData, targetMonth: e.target.value})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium mt-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || forceUpdating} className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>

          <Button onClick={handleForceUpdate} disabled={saving || forceUpdating} variant="outline" className="flex-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-medium">
            <RefreshCw className={`w-4 h-4 mr-2 ${forceUpdating ? 'animate-spin' : ''}`} />
            {forceUpdating ? 'Updating...' : 'Force Update Sidebar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
