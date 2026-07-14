import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { requestNotificationPermission } from '../../hooks/useNotifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function NotificationPrompt() {
  const { user, profile } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // Only evaluate if running in a browser environment
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Check if dismissed in this browser
    const dismissed = localStorage.getItem('notificationPromptDismissed');

    // Only show if logged in, haven't explicitly disabled, not already granted, and not dismissed
    if (
      user &&
      profile &&
      profile.notificationsEnabled !== false &&
      (Notification.permission === 'default' || Notification.permission === 'denied') &&
      !dismissed
    ) {
      setShowPrompt(true);
      if (Notification.permission === 'denied') {
        setDenied(true);
      }
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            setShowPrompt(false);
          } else if (permissionStatus.state === 'denied') {
            setDenied(true);
          } else if (permissionStatus.state === 'prompt') {
            setDenied(false);
          }
        };
      });
    }
  }, [user, profile]);

  const handleDismiss = () => {
    localStorage.setItem('notificationPromptDismissed', 'true');
    setShowPrompt(false);
  };

  const handleEnable = async () => {
    if (!user || !profile) return;

    const granted = await requestNotificationPermission(user.uid, profile);

    if (granted) {
      // Ensure it is turned on in their profile as well
      await updateDoc(doc(db, 'users', user.uid), {
        notificationsEnabled: true
      });
      setShowPrompt(false);
    } else {
      // User explicitly denied or blocked
      setDenied(true);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-[#1e293b] border-b border-[#334155] px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex w-0 flex-1 items-center">
          <span className="flex rounded-lg bg-cyan-500 p-2">
            <Bell className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <div className="ml-3 flex flex-col">
            <p className="font-medium text-white">
              <span className="md:hidden">Enable notifications</span>
              <span className="hidden md:inline">Never miss a pick result! Enable push notifications.</span>
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              iOS users: You must "Add to Home Screen" first. Android/Web users: Check browser site settings if blocked.
            </p>
          </div>
        </div>

        {denied ? (
          <div className="order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto sm:ml-4 text-sm text-red-400 font-medium">
            Permission denied. Please enable them in your <a href="https://support.google.com/chrome/answer/3220216?hl=en&co=GENIE.Platform%3DAndroid" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300">browser settings</a>.
          </div>
        ) : (
          <div className="order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto">
            <button
              onClick={handleEnable}
              className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-cyan-600 shadow-sm hover:bg-cyan-50"
            >
              Enable
            </button>
          </div>
        )}

        <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="-mr-1 flex rounded-md p-2 hover:bg-[#334155] focus:outline-none focus:ring-2 focus:ring-white"
          >
            <span className="sr-only">Dismiss</span>
            <X className="h-5 w-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
