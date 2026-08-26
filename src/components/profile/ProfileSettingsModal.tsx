import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Settings, Download, Coins } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { requestNotificationPermission } from '../../hooks/useNotifications';
import { Link } from 'react-router-dom';

export function ProfileSettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user, profile } = useAuth();
  const { isInstallable, promptInstall } = useInstallPrompt();
  
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{type: 'success' | 'error', text: React.ReactNode} | null>(null);
  
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [equipLoading, setEquipLoading] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '');
      setNewName(profile.name || '');
      setNotificationsEnabled(profile.notificationsEnabled !== false);
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInventory = async () => {
      try {
        setInventoryLoading(true);
        const snap = await getDocs(collection(db, 'shopItems'));
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventoryItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching inventory", e);
      } finally {
        setInventoryLoading(false);
      }
    };
    fetchInventory();
  }, [isOpen]);

  const handleUpdateInfo = async () => {
    if (!user) return;
    setUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      if (!newUsername.trim() || !newName.trim()) {
        throw new Error("Username and Display Name cannot be empty.");
      }
      
      let token = await auth.currentUser?.getIdToken();
      if (newUsername !== profile?.username) {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(newUsername)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to check username availability.");
        const data = await res.json();
        if (data.exists) throw new Error("Username is already taken.");
      }

      if (notificationsEnabled) {
        await requestNotificationPermission(user.uid, profile);
      }
      
      const updateData: any = {
        username: newUsername.trim(),
        name: newName.trim(),
        notificationsEnabled
      };
      
      if (!notificationsEnabled) {
        updateData.fcmTokens = [];
      }

      await updateDoc(userRef, updateData);

      setSettingsMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || "Failed to update profile." });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSettingsMessage({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || "Failed to send reset email." });
    }
  };

  const handleEquip = async (itemId: string | null, type: string) => {
    if (!user || !profile) return;
    setEquipLoading(type);
    try {
      const updatedCosmetics = { ...(profile.equippedCosmetics || {}) };
      if (itemId === null) {
        delete updatedCosmetics[type];
      } else {
        updatedCosmetics[type] = itemId;
      }
      await updateDoc(doc(db, 'users', user.uid), { equippedCosmetics: updatedCosmetics });
    } catch (err) {
      console.error("Failed to equip item", err);
      alert("Failed to equip item.");
    } finally {
      setEquipLoading(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-8 h-[70vh] overflow-y-auto custom-scrollbar pr-2">
        
        {/* Inventory Section */}
        <div>
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
            <Coins className="w-5 h-5 text-cyan-400" /> Inventory & Cosmetics
          </h3>
          {inventoryLoading ? (
            <div className="text-zinc-500 text-sm">Loading inventory...</div>
          ) : inventoryItems.length === 0 ? (
             <div className="text-zinc-500 text-sm">You haven't unlocked any cosmetics yet.</div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile?.inventory?.map((invId: string) => {
                   const item = inventoryItems.find(i => i.id === invId);
                   if (!item) return null;
                   const isEquipped = profile?.equippedCosmetics?.[item.type] === item.id;
                   return (
                     <div key={item.id} className={`bg-[#18181a] border rounded-xl p-4 flex flex-col ${isEquipped ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-zinc-800'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="text-md font-bold text-zinc-200">{item.name}</h4>
                           <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">{item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4 flex-1">{item.description}</p>
                        <Button
                           onClick={() => handleEquip(isEquipped ? null : item.id, item.type)}
                           disabled={equipLoading === item.type}
                           variant={isEquipped ? "destructive" : "default"}
                           className={`w-full ${isEquipped ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                           size="sm"
                        >
                           {equipLoading === item.type ? 'Processing...' : isEquipped ? 'Unequip' : 'Equip'}
                        </Button>
                     </div>
                   );
                })}
             </div>
          )}
        </div>

        {/* Settings Section */}
        <div>
           <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
             <Settings className="w-5 h-5 text-zinc-400" /> Account Settings
           </h3>
           <div className="space-y-4">
              {settingsMessage && (
                <div className={`p-3 rounded-lg text-sm ${settingsMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {settingsMessage.text}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
                <Input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
                <Input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <div>
                  <h4 className="text-sm font-medium text-zinc-200">Push Notifications</h4>
                  <p className="text-xs text-zinc-500">Receive alerts for picks and payouts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={handleUpdateInfo} disabled={updatingSettings} className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white font-bold">
                  {updatingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button onClick={handlePasswordReset} variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                  Reset Password
                </Button>
              </div>

              {isInstallable && (
                <div className="mt-4 p-4 border border-cyan-900/50 bg-cyan-950/20 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-400">Install App</h4>
                    <p className="text-xs text-zinc-400">Install ChainLink for a better mobile experience.</p>
                  </div>
                  <Button onClick={promptInstall} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                    <Download className="w-4 h-4 mr-2" /> Install
                  </Button>
                </div>
              )}
           </div>
        </div>

      </div>
    </Modal>
  );
}
