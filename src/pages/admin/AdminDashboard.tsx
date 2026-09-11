import { FirebaseImage } from '../../components/ui/FirebaseImage';
import React, { useState, useEffect } from "react";
import { Navigate, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { Menu } from 'lucide-react';

import { AdminSidebar } from './components/AdminSidebar';
import { GenericTable } from './components/GenericTable';
import { AdminLeagues } from './leagues/AdminLeagues';

const MatchupsAdminHub = React.lazy(() => import('./matchups/MatchupsAdminHub'));
const Link4AdminPage = React.lazy(() => import('./link4/Link4AdminPage'));
const CreateAchievementPage = React.lazy(() => import('./achievements/CreateAchievementPage'));
const AwardAchievementPage = React.lazy(() => import('./achievements/AwardAchievementPage'));
const AchievementsListPage = React.lazy(() => import('./achievements/AchievementsListPage'));
const EditAchievementPage = React.lazy(() => import('./achievements/EditAchievementPage'));
const ShopItemsListPage = React.lazy(() => import('./shopItems/ShopItemsListPage'));
const CreateShopItemPage = React.lazy(() => import('./shopItems/CreateShopItemPage'));
const EditShopItemPage = React.lazy(() => import('./shopItems/EditShopItemPage'));
const NotificationsListPage = React.lazy(() => import('./notifications/NotificationsListPage'));
const AnnouncementsAdminPage = React.lazy(() => import('./announcements/AnnouncementsAdminPage'));
const SponsorsListPage = React.lazy(() => import('./sponsors/SponsorsListPage'));
const CreateSponsorPage = React.lazy(() => import('./sponsors/CreateSponsorPage'));
const EditSponsorPage = React.lazy(() => import('./sponsors/EditSponsorPage'));
const PickEmAdminPage = React.lazy(() => import('./pickem/PickEmAdminPage'));
const Gridiron3x3AdminPage = React.lazy(() => import('./gridiron/Gridiron3x3AdminPage'));
const BracketsAdminPage = React.lazy(() => import('./brackets/BracketsAdminPage'));
const AdminPicksPage = React.lazy(() => import('./picks/AdminPicksPage'));
const ReferralsAdminPage = React.lazy(() => import('./referrals/ReferralsAdminPage'));
const UsersListPage = React.lazy(() => import('./users/UsersListPage'));
const TestAccountsAdminPage = React.lazy(() => import('./users/TestAccountsAdminPage'));
const LinkTransactionsAdminPage = React.lazy(() => import('./logs/LinkTransactionsAdminPage'));
const ErrorLogsAdminPage = React.lazy(() => import('./logs/ErrorLogsAdminPage'));
const OrdersAdminPage = React.lazy(() => import('./logs/OrdersAdminPage'));
const AdminOddsPage = React.lazy(() => import('./odds/AdminOddsPage'));
const SystemAdminHub = React.lazy(() => import('./system/SystemAdminHub'));
const AdminGuidePage = React.lazy(() => import('./guide/AdminGuidePage'));

function MatchupEditRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/matchups?action=edit&id=${id}`} replace />;
}

function PickEditRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/picks?edit=${id}`} replace />;
}

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
                {/* Unified Matchups & Builder Hub */}
                <Route path="matchups/*" element={<MatchupsAdminHub />} />

                {/* Legacy Matchup & Builder subroutes redirecting to unified Hub */}
                <Route path="matchups/create" element={<Navigate to="/admin/matchups?action=create" replace />} />
                <Route path="matchups/:id" element={<MatchupEditRedirect />} />
                <Route path="pga-builder" element={<Navigate to="/admin/matchups?tab=pga" replace />} />
                <Route path="prop-builder" element={<Navigate to="/admin/matchups?tab=prop" replace />} />

                {/* Picks routes */}
                <Route path="picks" element={<AdminPicksPage />} />
                <Route path="picks/edit/:id" element={<PickEditRedirect />} />

                {/* Announcements */}
                <Route path="announcements/*" element={<AnnouncementsAdminPage />} />

                {/* Sponsors */}
                <Route path="sponsors" element={<SponsorsListPage />} />
                <Route path="sponsors/create" element={<Navigate to="/admin/sponsors" replace />} />
                <Route path="sponsors/edit/:id" element={<Navigate to="/admin/sponsors" replace />} />

                {/* Achievements */}
                <Route path="achievements" element={<AchievementsListPage />} />
                <Route path="achievements/create" element={<Navigate to="/admin/achievements" replace />} />
                <Route path="achievements/award" element={<Navigate to="/admin/achievements" replace />} />
                <Route path="achievements/edit/:id" element={<Navigate to="/admin/achievements" replace />} />

                {/* Flat routes */}
                <Route path="pickem/*" element={<PickEmAdminPage />} />
                <Route path="gridiron-3x3/*" element={<Gridiron3x3AdminPage />} />
                <Route path="brackets/*" element={<BracketsAdminPage />} />
                <Route path="challenges" element={<GenericTable collectionName="globalQuiz" />} />
                <Route path="link4/*" element={<Link4AdminPage />} />
                <Route path="users" element={<UsersListPage />} />
                <Route path="users/test-accounts" element={<TestAccountsAdminPage />} />
                <Route path="logs/transactions" element={<LinkTransactionsAdminPage />} />
                <Route path="logs/errors" element={<ErrorLogsAdminPage />} />
                <Route path="logs/orders" element={<OrdersAdminPage />} />
                <Route path="referrals" element={<ReferralsAdminPage />} />
                <Route path="prize" element={<Navigate to="/admin/system" replace />} />

                {/* Legacy route redirects to unified UsersListPage */}
                <Route path="users/cosmetics" element={<Navigate to="/admin/users" replace />} />
                <Route path="users/links" element={<Navigate to="/admin/users" replace />} />
                <Route path="premium" element={<Navigate to="/admin/users" replace />} />

                {/* Notifications */}
                <Route path="notifications" element={<NotificationsListPage />} />
                <Route path="notifications/create" element={<Navigate to="/admin/notifications" replace />} />
                <Route path="notifications/edit/:id" element={<Navigate to="/admin/notifications" replace />} />

                {/* Shop Items */}
                <Route path="shopItems" element={<ShopItemsListPage />} />
                <Route path="shopItems/create" element={<CreateShopItemPage />} />
                <Route path="shopItems/edit/:id" element={<EditShopItemPage />} />

                {/* Settings & Odds */}
                <Route path="odds" element={<AdminOddsPage />} />
                <Route path="settings/scraper" element={<Navigate to="/admin/odds" replace />} />

                {/* Admin Guide */}
                <Route path="guide" element={<AdminGuidePage />} />

                {/* Unified System Operations Hub */}
                <Route path="system" element={<SystemAdminHub />} />
                <Route path="system/banner" element={<Navigate to="/admin/system" replace />} />
                <Route path="system/rollover" element={<Navigate to="/admin/system" replace />} />
                <Route path="system/engagement" element={<Navigate to="/admin/system" replace />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="matchups" replace />} />
             </Routes>
              </React.Suspense>
          </main>
       </div>
    </div>
  );
}
