import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, linkWithCredential, AuthCredential, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;
export let storage: FirebaseStorage;

export const initFirebase = async () => {
  let dynamicConfig: any = { ...firebaseConfig };
  try {
    const res = await fetch('/__/firebase/init.json');
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const initJson = await res.json();
        dynamicConfig = { ...dynamicConfig, ...initJson };
      }
    }
  } catch (e) {
    console.warn('Could not fetch dynamic firebase init config, using local environment variables.');
  }

  const customProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || dynamicConfig.projectId;
  const isCustomProject = customProjectId && customProjectId !== firebaseConfig.projectId;
  const finalConfig = {
    ...dynamicConfig,
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || dynamicConfig.apiKey || '').trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || dynamicConfig.authDomain,
    projectId: customProjectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || dynamicConfig.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || dynamicConfig.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || dynamicConfig.appId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || dynamicConfig.measurementId
  };

  app = initializeApp(finalConfig);
  
  try {
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase Auth initialization failed:", e);
  }

  try {
    const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (isCustomProject ? '(default)' : firebaseConfig.firestoreDatabaseId);
    db = getFirestore(app, databaseId);
  } catch (e) {
    console.error("Firestore initialization failed:", e);
  }

  try {
    storage = getStorage(app);
  } catch (e) {
    console.error("Storage initialization failed:", e);
  }
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const discordProvider = new OAuthProvider('discord.com');
discordProvider.addScope('identify');
discordProvider.addScope('email');

const ensureUserProfile = async (user: User, username?: string, referrerId?: string) => {
  // Check if user exists, if not create default profile
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const resolvedUsername = username || 'User' + Math.floor(Math.random() * 1000000);
    const defaultData: any = {
      email: user.email,
      name: user.displayName || 'Anonymous',
      username: resolvedUsername,
      usernameLower: resolvedUsername.toLowerCase(),
      image: user.photoURL || '',
      links: 10, // starting links
      role: 'USER', // Defaulting to USER for security
      status: 'ACTIVE',
      stats: { wins: 0, losses: 0, pushes: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      needsOnboarding: username ? false : true,
    };

    if (referrerId) {
      defaultData.referrerId = referrerId;
    }

    await setDoc(userRef, defaultData);

    // If they were referred, update the referrer's count via API
    if (referrerId) {
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/referral/increment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ referrerId })
        });
      } catch (e) {
        console.error("Failed to update referrer count via API", e);
      }
    }

    // Initialize an empty chain for them
    const chainRef = doc(db, 'chains', user.uid + '_current');
    await setDoc(chainRef, {
      userId: user.uid,
      active: true,
      chain: 0,
      wins: 0,
      losses: 0,
      best: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
};

const handlePendingCredential = async (user: User) => {
  const pendingCredStr = sessionStorage.getItem('pendingCred');
  if (pendingCredStr) {
    try {
      const parsed = JSON.parse(pendingCredStr);
      let cred = null;
      if (parsed.providerId === 'google.com') {
        cred = GoogleAuthProvider.credential(parsed.idToken, parsed.accessToken);
      } else if (parsed.providerId === 'discord.com') {
        // Use OAuthProvider.credentialFromJSON if available in the type definitions,
        // otherwise we cast to any since we know it exists in the implementation.
        cred = (OAuthProvider as any).credentialFromJSON(parsed);
      }
      if (cred) {
        await linkWithCredential(user, cred);
      }
    } catch (e) {
      console.error("Failed to link pending credential:", e);
    } finally {
      sessionStorage.removeItem('pendingCred');
    }
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    window.dispatchEvent(new Event('mock-login'));
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential && userCredential.user) {
      await ensureUserProfile(userCredential.user);
      await handlePendingCredential(userCredential.user);
    }
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential') {
      let methods: string[] = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, email);
      } catch (e) {}
      if (methods.includes('google.com')) {
        throw new Error('This email is associated with a Google account. Please sign in with Google.');
      }
    }
    console.error('Email login failed', error);
    throw error;
  }
};

export const signupWithEmail = async (email: string, pass: string, username: string, referrerId?: string) => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    window.dispatchEvent(new CustomEvent('mock-login', { detail: { email, username, referrerId } }));
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential && userCredential.user) {
      await ensureUserProfile(userCredential.user, username, referrerId);
    }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      let methods: string[] = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, email);
      } catch (e) {}
      if (methods.includes('google.com')) {
        throw new Error('This email is already associated with a Google account. Please sign in with Google.');
      }
    }
    console.error('Email signup failed', error);
    throw error;
  }
};

export const loginWithDiscord = async () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    window.dispatchEvent(new Event('mock-login'));
    return;
  }
  try {
    const userCredential = await signInWithPopup(auth, discordProvider);
    if (userCredential && userCredential.user) {
      const referrerId = localStorage.getItem('chainlink_referrer_id') || undefined;
      await ensureUserProfile(userCredential.user, undefined, referrerId);
      await handlePendingCredential(userCredential.user);
      if (referrerId) localStorage.removeItem('chainlink_referrer_id');
    }
  } catch (error: any) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCred = OAuthProvider.credentialFromError(error);
      if (pendingCred) {
        sessionStorage.setItem('pendingCred', JSON.stringify(pendingCred.toJSON()));
      }
      const email = error.customData?.email;
      if (email) {
        let methods: string[] = [];
        try {
          methods = await fetchSignInMethodsForEmail(auth, email);
        } catch (e) {}
        if (methods.includes('password')) {
          throw new Error(`An account already exists with ${email}. Please sign in using your Email/Password to link accounts.`);
        }
        if (methods.includes('google.com')) {
          throw new Error(`An account already exists with ${email}. Please sign in with Google to link accounts.`);
        }
      }
      throw new Error('An account already exists with different credentials. Please sign in using the original method to link accounts.');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn('Popup closed by user.');
      return;
    }
    console.warn('Popup login failed, falling back to redirect', error);
    try {
      await signInWithRedirect(auth, discordProvider);
    } catch (redirectError: any) {
      console.error('Redirect login failed', redirectError);
      throw redirectError;
    }
  }
};

export const loginWithGoogle = async () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    window.dispatchEvent(new Event('mock-login'));
    return;
  }
  try {
    const userCredential = await signInWithPopup(auth, provider);
    if (userCredential && userCredential.user) {
      const referrerId = localStorage.getItem('chainlink_referrer_id') || undefined;
      await ensureUserProfile(userCredential.user, undefined, referrerId);
      await handlePendingCredential(userCredential.user);
      if (referrerId) localStorage.removeItem('chainlink_referrer_id');
    }
  } catch (error: any) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCred = GoogleAuthProvider.credentialFromError(error);
      if (pendingCred) {
        sessionStorage.setItem('pendingCred', JSON.stringify(pendingCred.toJSON()));
      }
      const email = error.customData?.email;
      if (email) {
        let methods: string[] = [];
        try {
          methods = await fetchSignInMethodsForEmail(auth, email);
        } catch (e) {}
        if (methods.includes('password')) {
          throw new Error(`An account already exists with ${email}. Please sign in using your Email/Password to link accounts.`);
        }
        // Since we are logging in with Google, the collision might be with Discord
        throw new Error(`An account already exists with ${email}. Please sign in using the original method to link accounts.`);
      }
      throw new Error('An account already exists with different credentials. Please sign in using the original method to link accounts.');
    }
    console.warn('Popup login failed, falling back to redirect', error);
    try {
      await signInWithRedirect(auth, provider);
    } catch (redirectError: any) {
      console.error('Redirect login failed', redirectError);
      throw redirectError;
    }
  }
};

export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const referrerId = localStorage.getItem('chainlink_referrer_id') || undefined;
      await ensureUserProfile(user, undefined, referrerId);
      await handlePendingCredential(user);
      if (referrerId) localStorage.removeItem('chainlink_referrer_id');
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error handling redirect result', error);
    throw error;
  }
};

export const logout = () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    window.dispatchEvent(new Event('mock-logout'));
    return;
  }
  return signOut(auth);
};
