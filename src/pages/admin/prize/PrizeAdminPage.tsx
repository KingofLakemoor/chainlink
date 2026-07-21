import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

export default function PrizeAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    try {
      await setDoc(doc(db, 'settings', 'monthlyPrize'), prizeData);
      alert("Saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setSaving(false);
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

        <Button onClick={handleSave} disabled={saving} className="w-full mt-4 bg-[#22c55e] hover:bg-[#16a34a] text-white">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
