import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Link2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If they somehow get here without needing onboarding, redirect to dashboard
  React.useEffect(() => {
    if (profile && profile.needsOnboarding === false) {
      navigate('/');
    }
  }, [profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    if (!user || !profile) {
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

      const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to check username availability.");
      }
      const checkData = await res.json();
      if (checkData.exists) {
        throw new Error("Username is already taken.");
      }

      // 3. Update Firestore profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: username,
        usernameLower: usernameLower,
        needsOnboarding: false
      });

      setSuccess('Username successfully set!');

      // Navigate to dashboard shortly after success
      setTimeout(() => {
        navigate('/');
      }, 1000);

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
            <Link2 className="w-8 h-8 text-[#22c55e]" />
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
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
              placeholder="e.g. chainmaster99"
              required
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
