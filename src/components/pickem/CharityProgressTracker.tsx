import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

export function CharityProgressTracker() {
  const [progress, setProgress] = useState<{ raised: number; goal: number; pot: number; maxPot: number } | null>(null);
  
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/charity/progress');
        if (res.ok) {
          const data = await res.json();
          setProgress(data);
        }
      } catch (err) {
        console.error("Failed to load charity progress", err);
      }
    };
    fetchProgress();
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-black/60 border border-purple-500/30 rounded-xl p-5 relative overflow-hidden">
      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-yellow-400" />
        Live Fundraising Progress
      </h4>
      
      <div className="space-y-6">
        {/* Prize Pot Tracker */}
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-zinc-300">Club 602 Prize Pot</span>
            <span className="text-emerald-400 font-bold">{progress ? formatCurrency(progress.pot) : '---'}</span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out rounded-full" 
              style={{ width: `${progress ? Math.min((progress.pot / progress.maxPot) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-right">Funded by Pick 'Em entries</p>
        </div>

        {/* Ashley's Goal Tracker */}
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-zinc-300">Ashley's Direct Donations Goal</span>
            <span className="text-yellow-400 font-bold">{progress ? formatCurrency(progress.raised) : '---'} / {progress ? formatCurrency(progress.goal) : '---'}</span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out rounded-full" 
              style={{ width: `${progress && progress.goal > 0 ? Math.min((progress.raised / progress.goal) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-right">Direct to YES Day page</p>
        </div>
      </div>
    </div>
  );
}
