import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Link2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, profile, loading, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-suggest an initial clean and available username from user profile/display name/email
  React.useEffect(() => {
    let isMounted = true;
    const suggestUsername = async () => {
      if (!username && (user || profile)) {
        const rawCandidate = user?.displayName || (profile?.name && !/^User(_|\d)/i.test(profile.name) ? profile.name : '') || user?.email?.split('@')[0] || '';
        let sanitized = rawCandidate.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
        if (sanitized.length < 3 || /^User(_|\d)/i.test(sanitized)) {
          sanitized = 'User_' + Math.floor(1000 + Math.random() * 9000);
        }

        let availableName = sanitized;
        try {
          const idToken = user ? await user.getIdToken().catch(() => null) : null;
          const headers: Record<string, string> = idToken ? { 'Authorization': `Bearer ${idToken}` } : {};
          const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(sanitized)}&excludeUid=${encodeURIComponent(user?.uid || '')}`, { headers });
          if (res.ok) {
            const checkData = await res.json();
            if (checkData.exists) {
              const baseName = sanitized.slice(0, 16);
              availableName = `${baseName}${Math.floor(100 + Math.random() * 900)}`;
            }
          }
        } catch (e) {
          console.warn("Error auto-suggesting username:", e);
        }

        if (isMounted) {
          setUsername(availableName);
        }
      }
    };
    suggestUsername();
    return () => { isMounted = false; };
  }, [user, profile]);

  // If they somehow get here without needing onboarding, redirect to dashboard or target page
  React.useEffect(() => {
    if (profile && profile.needsOnboarding === false) {
      const redirectUrl = localStorage.getItem('chainlink_redirect_after_login');
      if (redirectUrl) {
        localStorage.removeItem('chainlink_redirect_after_login');
        navigate(redirectUrl, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [profile, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-zinc-400 font-medium">Loading session...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    if (!user) {
      setError('You must be logged in to set a username.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Basic format check
      if (username.length < 3) {
        throw new Error("Username must be at least 3 characters.");
      }
      if (username.length > 20) {
        throw new Error("Username must be less than 20 characters.");
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
         throw new Error("Username can only contain letters, numbers, and underscores.");
      }

      // 2. Uniqueness check (case-insensitive)
      const usernameLower = username.toLowerCase();

      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}&excludeUid=${encodeURIComponent(user.uid)}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (res.ok) {
          const checkData = await res.json();
          if (checkData.exists) {
            throw new Error("Username is already taken.");
          }
        } else {
          throw new Error("Unable to verify username availability. Please try again.");
        }
      } catch (checkErr: any) {
        if (checkErr.message === "Username is already taken." || checkErr.message === "Unable to verify username availability. Please try again.") {
          throw checkErr;
        }
        throw new Error("Network error checking username availability. Please try again.");
      }

      // 3. Ensure base user profile document exists before updating
      const referrerId = typeof window !== 'undefined' ? (localStorage.getItem('chainlink_referrer_id') || undefined) : undefined;
      const { ensureUserProfile } = await import('../../lib/firebase');
      await ensureUserProfile(user, username, referrerId);

      // 4. Update Firestore profile atomically (setDoc with merge: true)
      const userRef = doc(db, 'users', user.uid);
      const updatePayload = {
        username: username,
        usernameLower: usernameLower,
        needsOnboarding: false,
        updatedAt: Date.now()
      };
      await setDoc(userRef, updatePayload, { merge: true });

      // Optimistically update AuthContext profile state to prevent race conditions in route guards
      updateProfileState(updatePayload);

      setSuccess('Username successfully set!');

      // Navigate immediately to target page or dashboard without delayed timeouts
      const redirectUrl = localStorage.getItem('chainlink_redirect_after_login');
      if (redirectUrl) {
        localStorage.removeItem('chainlink_redirect_after_login');
        navigate(redirectUrl, { replace: true });
      } else {
        navigate('/', { replace: true });
      }

    } catch (err: any) {
      setError(err.message || 'Failed to update username.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="w-full max-w-md z-10 bg-[#121212] border border-[#27272a] rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22c55e]/10 mb-6 border border-[#22c55e]/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <img src="/logo.png" alt="ChainLink" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2 font-display">Welcome to ChainLink!</h1>
          <p className="text-zinc-400">Let's set up your profile. Choose a unique username to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-sm text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
              placeholder="e.g. chainmaster99"
              required
              minLength={3}
              maxLength={20}
            />
            <p className="text-xs text-zinc-500 mt-2">
              This will be your public identifier. You can change it later in settings.
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]" disabled={isLoading || !!success}>
            {isLoading ? 'Saving...' : success ? 'Success!' : 'Set Username'}
          </Button>
        </form>
      </div>
    </div>
  );
}
