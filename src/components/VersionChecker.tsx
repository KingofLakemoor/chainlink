import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

declare const __APP_BUILD_TIME__: string | undefined;

export const VersionChecker: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const performReload = useCallback(async () => {
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }
    } catch (e) {
      console.error('Error during cache cleanup before reload:', e);
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set('v_refresh', Date.now().toString());
      window.location.href = url.toString();
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      // Check service worker registration for waiting updates
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update().catch(() => {});
          if (registration.waiting) {
            setHasUpdate(true);
            return;
          }
        }
      }

      // Check backend version endpoint
      const response = await fetch('/api/version?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok) {
        const data = await response.json();
        const serverVersion = data.version;
        const localVersion = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : null;

        if (localVersion && serverVersion && serverVersion !== localVersion) {
          // Compare build times
          const serverTime = new Date(serverVersion).getTime();
          const localTime = new Date(localVersion).getTime();

          if (!isNaN(serverTime) && !isNaN(localTime) && serverTime > localTime + 5000) {
            setHasUpdate(true);
          } else if (isNaN(serverTime) || isNaN(localTime)) {
            // String mismatch if non-date strings used
            setHasUpdate(true);
          }
        }
      }
    } catch (err) {
      // Ignore network errors on update check
    }
  }, []);

  useEffect(() => {
    // Check on initial load after 3 seconds
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    // Check periodically every 5 minutes
    const interval = setInterval(checkForUpdate, 5 * 60 * 1000);

    // Check when user refocuses the tab / window
    const handleFocus = () => {
      checkForUpdate();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    });

    // Listen for SW updatefound event
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                }
              });
            }
          });
        }
      });
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdate]);

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm bg-amber-500 text-zinc-950 px-4 py-3 rounded-xl shadow-2xl border border-amber-400/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2">
        <RefreshCw className={`w-5 h-5 text-zinc-950 shrink-0 ${isUpdating ? 'animate-spin' : ''}`} />
        <div className="text-xs font-semibold leading-tight">
          <p className="font-bold">App Update Available!</p>
          <p className="text-[11px] opacity-90">A new version of ChainLink is live.</p>
        </div>
      </div>
      <button
        onClick={performReload}
        disabled={isUpdating}
        className="shrink-0 bg-zinc-950 hover:bg-zinc-900 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
      >
        {isUpdating ? 'Updating...' : 'Update Now'}
      </button>
    </div>
  );
};
