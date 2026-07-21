import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Trophy, Copy, Check, Users, Target, UserPlus } from 'lucide-react';

export function SidebarProgress() {
  const { profile, user } = useAuth();
  const [prizeData, setPrizeData] = useState({
    activeUsersRequirement: 25,
    picksRequirement: 375,
    referralsRequirement: 10,
    prizeDescription: '$5 Club 602 gift card',
    sponsorName: 'Club 602',
    targetMonth: '',
    winCondition: 'Current Chain'
  });

  const [activeUsers, setActiveUsers] = useState(0);
  const [globalPicks, setGlobalPicks] = useState(0);
  const [globalReferrals, setGlobalReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const docRef = doc(db, 'settings', 'monthlyPrize');
        const docSnap = await getDoc(docRef);
        let currentPrizeData = { ...prizeData };
        if (docSnap.exists()) {
          currentPrizeData = { ...prizeData, ...docSnap.data() };
          setPrizeData(currentPrizeData as any);
        }

        // Get start of the targeted month (or current month if not set)
        let targetYear = new Date().getFullYear();
        let targetMonthIdx = new Date().getMonth();

        if (currentPrizeData.targetMonth) {
          const [yearStr, monthStr] = currentPrizeData.targetMonth.split('-');
          if (yearStr && monthStr) {
             targetYear = parseInt(yearStr);
             targetMonthIdx = parseInt(monthStr) - 1;
          }
        }

        const startOfMonth = new Date(targetYear, targetMonthIdx, 1, 0, 0, 0, 0);
        const startTimestamp = startOfMonth.getTime();

        const endOfMonth = new Date(targetYear, targetMonthIdx + 1, 1, 0, 0, 0, 0);
        const endTimestamp = endOfMonth.getTime();

        const token = await user?.getIdToken();

        // 1. Fetch matchups that take place in the target month
        const matchupsSnap = await getDocs(query(collection(db, 'matchups'),
             where('startTime', '>=', startTimestamp),
             where('startTime', '<', endTimestamp)));

        const validMatchupIds = matchupsSnap.docs.map(doc => doc.data().gameId).filter(Boolean);

        let totalPicks = 0;
        const uniqueUsers = new Set();

        // 2. Fetch picks for those matchups in chunks of 30 (Firestore in-query limit is 30)
        const chunkSize = 30;
        for (let i = 0; i < validMatchupIds.length; i += chunkSize) {
          const chunk = validMatchupIds.slice(i, i + chunkSize);
          if (chunk.length === 0) continue;

          const picksSnap = await getDocs(query(collection(db, 'picks'),
               where('matchupId', 'in', chunk)));

          totalPicks += picksSnap.size;
          picksSnap.docs.forEach(doc => {
              uniqueUsers.add(doc.data().userId);
          });
        }

        setActiveUsers(uniqueUsers.size);
        setGlobalPicks(totalPicks);
        
        // 3. Fetch referrals for the target month
        const targetMonthStr = currentPrizeData.targetMonth || new Date().toISOString().slice(0, 7);
        const monthlyStatsRef = doc(db, 'settings', `monthlyStats_${targetMonthStr}`);
        const statsSnap = await getDoc(monthlyStatsRef);
        if (statsSnap.exists()) {
          setGlobalReferrals(statsSnap.data().referrals || 0);
        } else {
          setGlobalReferrals(0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleCopyReferral = () => {
    if (profile?.id) {
      const referralLink = `${window.location.origin}/login?ref=${profile.id}`;
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;

  const userProgress = Math.min(100, (activeUsers / (prizeData.activeUsersRequirement || 1)) * 100);
  const picksProgress = Math.min(100, (globalPicks / (prizeData.picksRequirement || 1)) * 100);
  const referralsProgress = prizeData.referralsRequirement > 0 ? Math.min(100, (globalReferrals / prizeData.referralsRequirement) * 100) : 0;

  return (
    <div className="mt-4 mb-4 px-3 space-y-4">
      <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-800/60">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-zinc-200">Monthly Prize</span>
        </div>
        <div className="text-sm text-[#22c55e] font-medium mb-1">
          {prizeData.prizeDescription}
        </div>
        <div className="text-xs text-zinc-400 mb-1">
          Sponsored by <span className="text-zinc-200">{prizeData.sponsorName}</span>
        </div>
        <div className="text-xs text-zinc-400 mb-3">
          Win Condition: <span className="text-zinc-200">{prizeData.winCondition || 'Current Chain'}</span>
        </div>

        <div className="space-y-3">
          {(prizeData.activeUsersRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3"/> Users</span>
                <span className="text-zinc-300">{String(activeUsers)} / {String(prizeData.activeUsersRequirement)}</span>
              </div>
              <Progress value={userProgress} className="h-1.5" />
            </div>
          )}

          {(prizeData.picksRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
                <span className="text-zinc-300">{String(globalPicks)} / {String(prizeData.picksRequirement)}</span>
              </div>
              <Progress value={picksProgress} className="h-1.5" />
            </div>
          )}
          

        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyReferral}
        className="w-full text-xs h-8 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:text-white"
      >
        {copied ? (
          <><Check className="w-3 h-3 mr-1.5 text-green-500" /> Copied!</>
        ) : (
          <><Copy className="w-3 h-3 mr-1.5" /> Copy Referral Link</>
        )}
      </Button>
    </div>
  );
}
