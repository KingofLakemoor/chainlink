import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebase-error';
import { auth, db, handleAuthRedirect } from './firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  chain: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, chain: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [chain, setChain] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error("Auth is not initialized! Firebase may be blocked by browser settings (e.g., third-party cookies disabled).");
      setLoading(false);
      return;
    }

    // Process redirect result if coming back from Google login
    handleAuthRedirect().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setChain(null);
        setLoading(false);
      }
    });

    if (import.meta.env.DEV) {
      const handleMockLogin = (e: any) => {
        const username = e.detail?.username || 'MockUser123';
        const email = e.detail?.email || 'mock@example.com';

        const mockUser = {
          uid: 'mock-user-123',
          email: email,
          displayName: 'Mock User',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock-user-123',
        } as User;

        const profileData = {
          id: mockUser.uid,
          email: mockUser.email,
          name: mockUser.displayName,
          username: username,
          image: mockUser.photoURL,
          links: 10,
          role: 'ADMIN', // Make mock user an ADMIN for testing locally
          status: 'ACTIVE',
          stats: { wins: 0, losses: 0, pushes: 0 },
          referralsCount: 42,
        };

        const chainData = {
          id: mockUser.uid + '_current',
          userId: mockUser.uid,
          active: true,
          chain: 0,
          wins: 0,
          losses: 0,
          best: 0,
        };

        setUser(mockUser);
        setProfile(profileData);
        setChain(chainData);
        setLoading(false);
      };

      const handleMockLogout = () => {
        setUser(null);
        setProfile(null);
        setChain(null);
        setLoading(false);
      };

      window.addEventListener('mock-login', handleMockLogin);
      window.addEventListener('mock-logout', handleMockLogout);

      return () => {
        unsubscribe();
        window.removeEventListener('mock-login', handleMockLogin);
        window.removeEventListener('mock-logout', handleMockLogout);
      };
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (document) => {
      if (document.exists()) {
        const data = document.data();

        const mergedProfile = { id: document.id, ...data };
        setProfile(mergedProfile);
      } else if (import.meta.env.DEV && user.uid === 'mock-user-123') {
        // preserve the mock profile
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Listen to current chain
    const unsubChain = onSnapshot(doc(db, 'chains', user.uid + '_current'), async (documentSnapshot) => {
      if (documentSnapshot.exists()) {
        setChain({ id: documentSnapshot.id, ...documentSnapshot.data() });
      } else {
        // Create the missing chain document for the user
        try {
          const { setDoc } = await import('firebase/firestore');
          const newChainData = {
            userId: user.uid,
            active: true,
            chain: 0,
            wins: 0,
            losses: 0,
            best: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await setDoc(doc(db, 'chains', user.uid + '_current'), newChainData);
          // The onSnapshot will automatically re-fire and set the state once created
        } catch (err) {
          console.error("Failed to create missing chain document:", err);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chains/${user.uid}_current`);
    });

    return () => {
      unsubProfile();
      unsubChain();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, chain, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
