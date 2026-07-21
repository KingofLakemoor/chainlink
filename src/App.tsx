import { useNotifications } from './hooks/useNotifications';
import { ToastProvider } from './components/ui/Toast';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { FirebaseImage } from './components/ui/FirebaseImage';
import { loginWithGoogle, loginWithDiscord, loginWithEmail, signupWithEmail, logout, db, auth } from './lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Button } from './components/ui/button';
import { SidebarProgress } from './components/SidebarProgress';
import { cn } from './lib/utils';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { NotificationPrompt } from './components/ui/NotificationPrompt';
import {
  Link2, LayoutDashboard, User as UserIcon, PlayCircle, Layers, Trophy, Grid,
  ShoppingCart, CheckCircle2, Users, LogOut, ShieldAlert, Menu, X, Flame, HelpCircle
} from 'lucide-react';
import {
  MdOutlineSportsSoccer, MdOutlineSportsBasketball, MdOutlineSportsHockey, MdOutlineSportsBaseball, MdOutlineSportsTennis
} from 'react-icons/md';
import { FaDiscord } from 'react-icons/fa';
import { Download } from 'lucide-react';

import { ErrorBoundaryWrapper } from './components/ErrorBoundary';

const Sidebar = React.memo(function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { isInstallable, promptInstall } = useInstallPrompt();

  if (!user) return null;


  const NavItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string }) => {
    const active = location.pathname === path;
    return (
      <Link to={path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-[#22c55e]/10 text-[#22c55e] font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
        <Icon className="w-5 h-5" />
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 w-[240px] bg-[#121212] border-r border-[#27272a] z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#27272a] bg-[#121212] shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-6 h-6 text-[#22c55e]" />
            <span className="font-bold text-xl font-display text-zinc-100">ChainLink</span>
          </div>
          <button className="md:hidden text-zinc-400" onClick={() => setOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5 custom-scrollbar">
        <SidebarProgress />
        <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" />
        <NavItem icon={UserIcon} label="My Profile" path="/profile" />

        <div className="mt-6 mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">ChainLink</div>
        <NavItem icon={PlayCircle} label="Play ChainLink" path="/" />
        <NavItem icon={Layers} label="Pick'em" path="/pickem" />
        <NavItem icon={CheckCircle2} label="My Stats" path="/mypicks" />
        <NavItem icon={Trophy} label="Leaderboards" path="/leaderboards" />
        <NavItem icon={ShoppingCart} label="Link Shop" path="/shop" />
        <NavItem icon={Grid} label="Link4" path="/link4" />
        <NavItem icon={HelpCircle} label="Help & Rules" path="/help" />

        {profile?.role === "ADMIN" && (
          <>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-red-500/70 uppercase tracking-wider">Admin</div>
            <NavItem icon={ShieldAlert} label="Admin Console" path="/admin" />
          </>
        )}
      </div>

      <div className="p-4 mt-auto border-t border-[#27272a] space-y-2">
        <Button variant="ghost" asChild className="w-full justify-start text-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/10">
          <a href="https://discord.gg/xUyEhaV9TH" target="_blank" rel="noopener noreferrer">
            <FaDiscord className="w-4 h-4 mr-2" /> Join Discord
          </a>
        </Button>
        {isInstallable && (
          <Button variant="outline" onClick={promptInstall} className="w-full justify-start bg-cyan-950/30 text-cyan-400 border-cyan-900/50 hover:bg-cyan-900/50 hover:text-cyan-300">
            <Download className="w-4 h-4 mr-2" /> Install App
          </Button>
        )}
        <Button variant="ghost" onClick={logout} className="w-full justify-start text-zinc-400 hover:text-zinc-200">
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </div>
      </div>
    </>
  );
});

function Landing() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check for referral code in URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const referrerId = searchParams.get('ref') || undefined;

  // Auto-switch to sign up if referral code is present
  useEffect(() => {
    if (referrerId) {
      setIsSignUp(true);
    }
  }, [referrerId]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signupWithEmail(email, password, username, referrerId);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication failed';
      if (msg.includes('auth/invalid-credential')) {
        msg = isSignUp 
          ? 'An account with this email may already exist, or the credentials are invalid.' 
          : 'Incorrect password, or this email is not registered yet. If you are new, click "Sign up" below to create an account!';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'This email address is already in use. Try logging in instead!';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'The password must be at least 6 characters long.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset failed', err);
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const isIframe = window.self !== window.top;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22c55e]/10 mb-6 border border-[#22c55e]/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Link2 className="w-8 h-8 text-[#22c55e]" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-100 mb-3 font-display">ChainLink</h1>
          <p className="text-zinc-400 text-base">Build your chain. Earn Links. Climb the ranks.</p>
        </div>

        {isIframe && (
          <div className="mb-6 p-4 text-xs bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-cyan-300 flex items-start gap-2.5 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <span className="text-sm">💡</span>
            <div>
              <p className="font-bold uppercase tracking-wide text-cyan-200 mb-0.5">Iframe Sandbox Alert</p>
              <p className="leading-relaxed">Google Sign-In popups and redirect authentication are restricted inside the preview frame by browser security policies. Please <strong>open this app in a new tab</strong> (click the "Open in new tab" icon in the top right of the preview) to use Google/Discord sign-in, or use Email SignUp below!</p>
            </div>
          </div>
        )}

        <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                  placeholder="cooluser123"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-zinc-400">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-[#22c55e] hover:underline font-medium focus:outline-none"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12 mt-2 font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]" disabled={isLoading}>
              {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3f3f46]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#121212] text-zinc-500">or</span>
              </div>
            </div>

          </form>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 border-[#3f3f46] hover:bg-zinc-800/50 flex items-center justify-center gap-2"
            onClick={async () => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              try {
                await loginWithGoogle();
              } catch (e: any) {
                setError(e.message || 'An error occurred during Google sign in.');
              }
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 border-[#3f3f46] hover:bg-zinc-800/50 flex items-center justify-center gap-2 mt-3"
            onClick={async () => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              try {
                await loginWithDiscord();
              } catch (e: any) {
                setError(e.message || 'An error occurred during Discord sign in.');
              }
            }}
          >
            <FaDiscord className="w-5 h-5 text-[#5865F2]" />
            Continue with Discord
          </Button>

          <p className="text-center text-sm text-zinc-400 mt-2">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-[#22c55e] hover:underline font-medium">
              {isSignUp ? 'Login' : 'Sign up'}
            </button>
          </p>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-8 text-center">
            <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300" onClick={() => window.dispatchEvent(new Event('mock-login'))}>
               Bypass Auth (Dev Only)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}



const TopStats = React.memo(function TopStats() {
  const { user, profile, chain } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-2 md:gap-5">
        <Link to="/login" className="text-zinc-100 hover:text-zinc-300 font-medium">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-5">
      <div className="hidden md:flex items-center gap-1.5 text-sm">
         <Link2 className="w-4 h-4 text-cyan-400" />
         <span className="font-mono text-cyan-400 font-medium tracking-wide">{profile?.links?.toLocaleString() || 0}</span>
      </div>
      <div className="hidden md:block w-px h-4 bg-zinc-700"></div>
      <div className="flex items-center gap-2 md:gap-3 text-sm">
         <span className={cn("font-bold tracking-tight", (chain?.chain || 0) < 0 ? "text-red-500" : "text-[#22c55e]")}>
           {(chain?.chain || 0) < 0 ? `L${Math.abs(chain?.chain || 0)}` : `W${chain?.chain || 0}`}
         </span>
         <span className="text-zinc-400 font-mono text-xs tracking-wider">
           {profile?.stats?.wins || 0} - {profile?.stats?.losses || 0} - {profile?.stats?.pushes || 0}
         </span>
      </div>
      <div className="w-px h-4 bg-zinc-700"></div>
      <div className="w-8 h-8 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 shrink-0">
        <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'guest'}`} src={profile?.image || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Avatar" loading="lazy" />
      </div>
    </div>
  );
});

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const location = useLocation();

  if (profile?.needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/': 'Play',
    '/profile': 'My Profile',
    '/pickem': "Pick'em",
    '/leaderboards': 'Leaderboards',
  }[location.pathname] || 'ChainLink';

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-50 font-sans overflow-hidden">
       <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
       <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
         <NotificationPrompt />
         {/* Mobile Header */}
         <div className="md:hidden h-16 border-b border-[#27272a] bg-[#121212]/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
           <div className="flex items-center gap-2">
             {user && (
               <button className="p-2 text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 mr-1" onClick={() => setSidebarOpen(true)}>
                 <Menu className="w-5 h-5" />
               </button>
             )}
             {!user && <Link2 className="w-6 h-6 text-[#22c55e]" />}
             <span className="font-bold text-lg font-display text-zinc-100">{pageTitle}</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="pointer-events-auto"><TopStats /></div>
           </div>
         </div>

         {/* Desktop Header */}
         <div className="hidden md:flex h-20 items-center justify-between px-8 bg-gradient-to-b from-[#0a0a0a] to-transparent sticky top-0 z-30 pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-3">
             <h1 className="text-2xl font-bold font-display text-zinc-100 tracking-tight">{pageTitle}</h1>
           </div>
           <div className="pointer-events-auto flex items-center gap-4">
             <TopStats />
           </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full max-w-full">
            {children}
         </div>
       </div>
    </div>
  );
}

function PrivateRoute({ children, allowOnboarding = false }: { children: React.ReactNode, allowOnboarding?: boolean }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Force onboarding if they need it and they aren't already on the onboarding page
  if (profile?.needsOnboarding && !allowOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
}

const PlayDashboard = React.lazy(() => import('./pages/play/PlayDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage'));
const AdvancedMetricsPage = React.lazy(() => import('./pages/advancedMetrics/AdvancedMetricsPage'));
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'));
const LeaderboardsPage = React.lazy(() => import('./pages/leaderboards/LeaderboardsPage'));
const ShopPage = React.lazy(() => import('./pages/shop/ShopPage'));
const MyPicksPage = React.lazy(() => import('./pages/mypicks/MyPicksPage'));
const BracketsPage = React.lazy(() => import('./pages/brackets/BracketsPage').then(module => ({ default: module.BracketsPage })));
const Link4Page = React.lazy(() => import('./pages/link4/Link4Page'));
const PickEmPage = React.lazy(() => import('./pages/pickem/PickEmPage'));
const SponsorPage = React.lazy(() => import('./pages/SponsorPage'));
const HelpPage = React.lazy(() => import('./pages/help/HelpPage'));
const OnboardingPage = React.lazy(() => import('./pages/onboarding/OnboardingPage'));

function GlobalEffects() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ErrorBoundaryWrapper>
      <BrowserRouter>
        <GlobalEffects />
        <React.Suspense fallback={<div className="flex items-center justify-center h-screen text-zinc-500">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Landing />} />
          <Route path="/onboarding" element={<PrivateRoute allowOnboarding={true}><OnboardingPage /></PrivateRoute>} />
          <Route path="/" element={<MainLayout><PlayDashboard /></MainLayout>} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<PrivateRoute><MainLayout><DashboardPage /></MainLayout></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><MainLayout><ProfilePage /></MainLayout></PrivateRoute>} />
          <Route path="/pickem" element={<PrivateRoute><MainLayout><PickEmPage /></MainLayout></PrivateRoute>} />
          <Route path="/pickem/:campaignId" element={<PrivateRoute><MainLayout><PickEmPage /></MainLayout></PrivateRoute>} />
          <Route path="/brackets" element={<MainLayout><BracketsPage /></MainLayout>} />
          <Route path="/brackets/:bracketId" element={<MainLayout><BracketsPage /></MainLayout>} />
          <Route path="/link4" element={<PrivateRoute><MainLayout><Link4Page /></MainLayout></PrivateRoute>} />
          <Route path="/mypicks" element={<PrivateRoute><MainLayout><MyPicksPage /></MainLayout></PrivateRoute>} />
          <Route path="/advanced-metrics" element={<PrivateRoute><MainLayout><AdvancedMetricsPage /></MainLayout></PrivateRoute>} />
          <Route path="/leaderboards" element={<PrivateRoute><MainLayout><LeaderboardsPage /></MainLayout></PrivateRoute>} />
          <Route path="/shop" element={<PrivateRoute><MainLayout><ShopPage /></MainLayout></PrivateRoute>} />
          <Route path="/sponsor" element={<SponsorPage />} />
          <Route path="/help" element={<MainLayout><HelpPage /></MainLayout>} />
          {/* Catch all route back to play */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </React.Suspense>
      </BrowserRouter>
      </ErrorBoundaryWrapper>
          </ToastProvider>
    </AuthProvider>
  );
}
