import { FirebaseImage } from '../../components/ui/FirebaseImage';
import React, { useState, useEffect } from "react";
import { Navigate, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { Menu } from 'lucide-react';

import { AdminSidebar } from './components/AdminSidebar';
import { GenericTable } from './components/GenericTable';
import { AdminMatchups } from './matchups/AdminMatchups';
import { AdminEditMatchup } from './matchups/AdminEditMatchup';
import { AdminLeagues } from './leagues/AdminLeagues';

const Link4AdminPage = React.lazy(() => import('./link4/Link4AdminPage'));
const CreateMatchupPage = React.lazy(() => import('./matchups/CreateMatchupPage'));
const PGABuilderPage = React.lazy(() => import('./pga/PGABuilderPage'));
const CreateAchievementPage = React.lazy(() => import('./achievements/CreateAchievementPage'));
const AwardAchievementPage = React.lazy(() => import('./achievements/AwardAchievementPage'));
const AchievementsListPage = React.lazy(() => import('./achievements/AchievementsListPage'));
const EditAchievementPage = React.lazy(() => import('./achievements/EditAchievementPage'));
const ShopItemsListPage = React.lazy(() => import('./shopItems/ShopItemsListPage'));
const CreateShopItemPage = React.lazy(() => import('./shopItems/CreateShopItemPage'));
const EditShopItemPage = React.lazy(() => import('./shopItems/EditShopItemPage'));
const NotificationsListPage = React.lazy(() => import('./notifications/NotificationsListPage'));
const CreateNotificationPage = React.lazy(() => import('./notifications/CreateNotificationPage'));
const EditNotificationPage = React.lazy(() => import('./notifications/EditNotificationPage'));
const AnnouncementsAdminPage = React.lazy(() => import('./announcements/AnnouncementsAdminPage'));
const SponsorsListPage = React.lazy(() => import('./sponsors/SponsorsListPage'));
const CreateSponsorPage = React.lazy(() => import('./sponsors/CreateSponsorPage'));
const EditSponsorPage = React.lazy(() => import('./sponsors/EditSponsorPage'));
const PickEmAdminPage = React.lazy(() => import('./pickem/PickEmAdminPage'));
const BracketsAdminPage = React.lazy(() => import('./brackets/BracketsAdminPage'));
const AdminPicksPage = React.lazy(() => import('./picks/AdminPicksPage'));
const ReferralsAdminPage = React.lazy(() => import('./referrals/ReferralsAdminPage'));
const UserCosmeticsAdminPage = React.lazy(() => import('./users/UserCosmeticsAdminPage'));
const AddLinksAdminPage = React.lazy(() => import('./users/AddLinksAdminPage'));
const LinkTransactionsAdminPage = React.lazy(() => import('./logs/LinkTransactionsAdminPage'));
const PremiumStatusAdminPage = React.lazy(() => import('./users/PremiumStatusAdminPage'));
const ScraperSettingsPage = React.lazy(() => import('./settings/ScraperSettingsPage'));
const PrizeAdminPage = React.lazy(() => import('./prize/PrizeAdminPage'));
const AdminGuidePage = React.lazy(() => import('./guide/AdminGuidePage'));
const EditPickPage = React.lazy(() => import('./picks/EditPickPage'));

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) return null;
  if (!profile || profile.role !== "ADMIN") return <Navigate to="/" replace />;

  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeSection = pathParts[1] || 'matchups';

  let headerTitle = activeSection;
  if (pathParts.length > 2) {
    headerTitle = `${activeSection} - ${pathParts[2]}`;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-50 font-sans">
       <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

       <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
          <div className="absolute -z-10 h-full w-full bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_80%)] opacity-5"></div>

          <header className="h-[4.5rem] flex items-center gap-4 px-4 md:px-8 border-b border-zinc-800/80 bg-[#121212]/80 backdrop-blur-md">
            <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-display text-xl font-bold tracking-wide capitalize text-zinc-100">{headerTitle.replace('-', ' ')}</h2>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
             <React.Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-500">Loading...</div>}>
              <Routes>
                <Route path="leagues" element={<AdminLeagues />} />
                {/* Matchups routes */}
                <Route path="matchups" element={<AdminMatchups />} />

                <Route path="picks" element={<AdminPicksPage />} />
                {/* Picks Routes */}
                <Route path="picks/edit/:id" element={
                  <EditPickPage />
                } />

                <Route path="matchups/create" element={<CreateMatchupPage />} />
<Route path="matchups/:id" element={<AdminEditMatchup />} />
                <Route path="pga-builder" element={<PGABuilderPage />} />

                {/* Announcements */}
                <Route path="announcements/*" element={<AnnouncementsAdminPage />} />

                {/* Sponsors */}
                <Route path="sponsors" element={<SponsorsListPage />} />
                <Route path="sponsors/create" element={<CreateSponsorPage />} />
                <Route path="sponsors/edit/:id" element={<EditSponsorPage />} />

                {/* Achievements */}
                <Route path="achievements" element={<AchievementsListPage />} />
                <Route path="achievements/create" element={<CreateAchievementPage />} />
                <Route path="achievements/award" element={<AwardAchievementPage />} />
                <Route path="achievements/edit/:id" element={<EditAchievementPage />} />

                {/* Flat routes */}
                <Route path="pickem/*" element={<PickEmAdminPage />} />
                <Route path="brackets/*" element={<BracketsAdminPage />} />
                <Route path="challenges" element={<GenericTable collectionName="globalQuiz" />} />
                <Route path="link4/*" element={<Link4AdminPage />} />
                <Route path="users" element={<GenericTable collectionName="users" />} />
                <Route path="users/cosmetics" element={<UserCosmeticsAdminPage />} />
                <Route path="users/links" element={<AddLinksAdminPage />} />
                <Route path="logs/transactions" element={<LinkTransactionsAdminPage />} />
                <Route path="premium" element={<PremiumStatusAdminPage />} />
                <Route path="referrals" element={<ReferralsAdminPage />} />
          <Route path="prize" element={<PrizeAdminPage />} />

                {/* Notifications */}
                <Route path="notifications" element={<NotificationsListPage />} />
                <Route path="notifications/create" element={<CreateNotificationPage />} />
                <Route path="notifications/edit/:id" element={<EditNotificationPage />} />

                {/* Shop Items */}
                <Route path="shopItems" element={<ShopItemsListPage />} />
                <Route path="shopItems/create" element={<CreateShopItemPage />} />
                <Route path="shopItems/edit/:id" element={<EditShopItemPage />} />

                {/* Settings */}
                <Route path="settings/scraper" element={<ScraperSettingsPage />} />

                {/* Admin Guide */}
                <Route path="guide" element={<AdminGuidePage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="matchups" replace />} />
             </Routes>
              </React.Suspense>
          </main>
       </div>
    </div>
  );
}
