import React, { useState } from 'react';
import BannerAdminPage from './BannerAdminPage';
import MonthlyRolloverPage from './MonthlyRolloverPage';
import EngagementAdminPage from './EngagementAdminPage';
import PrizeAdminPage from '../prize/PrizeAdminPage';
import { Megaphone, Calendar, Activity, Trophy, Settings } from 'lucide-react';

export default function SystemAdminHub() {
  const [activeTab, setActiveTab] = useState<'banner' | 'prize' | 'rollover' | 'engagement'>('banner');

  const tabs = [
    { id: 'banner', label: 'Play Page Banner', icon: Megaphone },
    { id: 'prize', label: 'Monthly Prize & Sponsor', icon: Trophy },
    { id: 'rollover', label: 'Monthly Rollover', icon: Calendar },
    { id: 'engagement', label: 'Engagement & Records', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6 pb-12">
      {/* Hub Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            System Operations & Settings
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage promotional banners, monthly prizes, end-of-month rollovers, and community engagement metrics.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex flex-wrap gap-2 bg-[#121212] p-1.5 border border-zinc-800 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'banner' && <BannerAdminPage />}
        {activeTab === 'prize' && <PrizeAdminPage />}
        {activeTab === 'rollover' && <MonthlyRolloverPage />}
        {activeTab === 'engagement' && <EngagementAdminPage />}
      </div>
    </div>
  );
}
