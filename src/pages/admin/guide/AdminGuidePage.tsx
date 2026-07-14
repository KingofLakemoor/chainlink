import React from 'react';
import { BookOpen, ShieldAlert, CheckCircle2, Link2, Users, Settings, Trophy } from 'lucide-react';

export default function AdminGuidePage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-4 border border-red-500/20">
          <BookOpen className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-zinc-100 font-display mb-2">Admin Operating Guide</h1>
        <p className="text-zinc-400 text-lg">Instructions for managing the ChainLink platform.</p>
      </div>

      <div className="space-y-12">
        {/* Matchups Management */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Managing Matchups</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <h3 className="font-bold text-white text-lg">Syncing Matchups</h3>
            <p>
              Matchups should be synced periodically using the <strong>"Sync ESPN APIs"</strong> button on the Matchups page. This fetches the latest games and updates statuses, scores, and odds.
            </p>
            <h3 className="font-bold text-white text-lg">Active/Inactive Status</h3>
            <p>
              By default, synced matchups may be set to Active based on the <strong>League Settings</strong>. If you want to hide a game from the main dashboard (e.g., if odds are heavily skewed), toggle its status to <strong>INACTIVE</strong>.
            </p>
            <h3 className="font-bold text-white text-lg">Finalizing and Grading</h3>
            <p>
              Games usually transition to <code>STATUS_FINAL</code> automatically via the sync. However, you can manually finalize a game by editing it, setting its status to <code>STATUS_FINAL</code>, and clicking <strong>"Finalize Matchup"</strong>. This will trigger the backend to grade all user picks associated with that game and distribute wins/losses and links.
            </p>
            <h3 className="font-bold text-white text-lg">Custom Titles</h3>
            <p>
              If you edit a matchup's title (e.g., to add "O/U 5.5"), check the <strong>"Lock Custom Title"</strong> box so the next ESPN sync doesn't overwrite your custom title.
            </p>
          </div>
        </section>

        {/* Link4 Management */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Link2 className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Link4 Management</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <h3 className="font-bold text-white text-lg">Excluding Matchups from Link4</h3>
            <p>
              In the main Matchups list, there is a "Link4" column. If a matchup has invalid moneyline odds or you simply don't want it available in the Link4 game, toggle it to <strong>EXCLUDED</strong>.
            </p>
            <h3 className="font-bold text-white text-lg">Link4 Segments</h3>
            <p>
              Link4 operates in "Segments" (e.g., a weekend). You must manually create these segments in the <strong>Link4 Admin</strong> page. Set a start time, end time, and entry cost.
            </p>
            <h3 className="font-bold text-white text-lg">Payouts</h3>
            <p>
              When a Link4 segment ends, the backend processor should automatically handle payouts. If it fails or you need to force it, you can use the manual payout tools in the Link4 admin dashboard. Remember that payouts only occur if all active players have finished their picks.
            </p>
          </div>
        </section>

        {/* User Management */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">User Management</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <h3 className="font-bold text-white text-lg">Adding Links</h3>
            <p>
              Navigate to <strong>Manage Links</strong> to manually grant Links to a user (e.g., for winning a contest or as a refund). You must know their exact username.
            </p>
            <h3 className="font-bold text-white text-lg">User Cosmetics</h3>
            <p>
              Use the <strong>User Cosmetics</strong> page to manually grant profile rings, titles, or banners to specific users.
            </p>
          </div>
        </section>

        {/* League & Scraper Settings */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Settings className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">League & Scraper Settings</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <h3 className="font-bold text-white text-lg">League Settings</h3>
            <p>
              On the <strong>Leagues</strong> page, you can set the default Active status for new games synced from a specific league. You can also mass-deactivate all scheduled games for a league if the season is over or you want to pause it.
            </p>
            <h3 className="font-bold text-white text-lg">Scraper Settings</h3>
            <p>
              In <strong>Settings &gt; Scraper Settings</strong>, you can define maximum moneyline odds. If an underdog's moneyline exceeds this value (e.g., +1000), the scraper will automatically mark the game as INACTIVE so it doesn't clutter the dashboard. You can set a global max or specific overrides per sport.
            </p>
          </div>
        </section>

        {/* Achievements & Shop */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Achievements & Shop</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <h3 className="font-bold text-white text-lg">Achievements</h3>
            <p>
              Create new achievements and manually award them to users. Most achievements require manual awarding via the <strong>Award Achievement</strong> page.
            </p>
            <h3 className="font-bold text-white text-lg">Shop Items</h3>
            <p>
              Create and edit items available in the Link Shop. You can set the cost, type (Banner, Ring, Title), and the specific value (e.g., the CSS class for a ring or the image URL for a banner). Set items to inactive to remove them from the store without deleting them.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
