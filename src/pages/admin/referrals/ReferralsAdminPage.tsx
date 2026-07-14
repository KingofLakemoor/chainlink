import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Share2 } from 'lucide-react';

interface User {
  id: string;
  name?: string;
  username?: string;
  referrerId?: string;
  referralsCount?: number;
}

export default function ReferralsAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const usersList: User[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
        setUsers(usersList);
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="text-zinc-500">Loading referral data...</div>;
  }

  // Build the tree map where key is userId, value is list of users they referred
  const referredMap: Record<string, User[]> = {};
  users.forEach(u => {
    if (u.referrerId) {
      if (!referredMap[u.referrerId]) {
        referredMap[u.referrerId] = [];
      }
      referredMap[u.referrerId].push(u);
    }
  });

  // Find root users (those who referred someone but weren't referred themselves, OR were referred but we want to show all top-level trees)
  // To avoid circular or missing roots, let's just list everyone who HAS referrals
  const usersWithReferrals = users.filter(u => referredMap[u.id] && referredMap[u.id].length > 0);
  const rootUsers = usersWithReferrals.filter(u => !u.referrerId || !usersWithReferrals.find(x => x.id === u.referrerId));

  const renderTree = (userId: string, depth = 0) => {
    const referredUsers = referredMap[userId] || [];
    if (referredUsers.length === 0) return null;

    return (
      <ul className={depth > 0 ? "pl-6 mt-2 space-y-2 border-l border-zinc-800/50" : "mt-2 space-y-2"}>
        {referredUsers.map(u => (
          <li key={u.id} className="relative before:absolute before:left-[-1px] before:top-4 before:w-4 before:h-px before:bg-zinc-800/50">
            <div className="flex items-center gap-2 pl-6">
              <div className="bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 text-sm flex items-center gap-2">
                <span className="font-bold text-zinc-300">{u.username || u.name || 'Anonymous'}</span>
                <span className="text-xs text-zinc-500 font-mono">({u.id})</span>
              </div>
            </div>
            {/* Recursively render if this user also referred others */}
            {referredMap[u.id] && (
              <div className="pl-6">
                 {renderTree(u.id, depth + 1)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-purple-400" /> Referral Chains
         </h1>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6">
         {usersWithReferrals.length === 0 ? (
            <p className="text-zinc-500">No referral chains found.</p>
         ) : (
            <div className="space-y-8">
               {rootUsers.map(rootUser => (
                  <div key={rootUser.id} className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-800/50">
                     <div className="flex items-center gap-2 mb-2">
                        <span className={rootUser.referrerId ? "text-orange-400 font-bold" : "text-purple-400 font-bold"}>
                           {rootUser.username || rootUser.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">({rootUser.referrerId ? `Orphaned: ${rootUser.id}` : rootUser.id})</span>
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-bold">
                           {referredMap[rootUser.id].length} Direct
                        </span>
                     </div>
                     {renderTree(rootUser.id)}
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
}
