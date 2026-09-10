import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { Share2, Users, Search, RefreshCw, ChevronRight, ChevronDown, Sparkles, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { Button } from '../../../components/ui/button';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  referrerId?: string;
  referralsCount?: number;
  premium?: boolean;
}

export default function ReferralsAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(500)));
      const usersList: User[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
      setUsers(usersList);

      // Default expand top root nodes
      const initialExpanded: Record<string, boolean> = {};
      usersList.forEach(u => {
        if (u.referralsCount && u.referralsCount > 0) {
          initialExpanded[u.id] = true;
        }
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error("Failed to fetch referral users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    users.forEach(u => { all[u.id] = true; });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

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

  // Find users who have referrals
  const usersWithReferrals = users.filter(u => referredMap[u.id] && referredMap[u.id].length > 0);
  const rootUsers = usersWithReferrals.filter(u => !u.referrerId || !usersWithReferrals.find(x => x.id === u.referrerId));

  // Compute metrics
  const totalReferredAccounts = users.filter(u => !!u.referrerId).length;
  const topReferrersCount = usersWithReferrals.length;

  const matchesSearch = (u: User): boolean => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(term);
    const usernameMatch = (u.username || '').toLowerCase().includes(term);
    const emailMatch = (u.email || '').toLowerCase().includes(term);
    const idMatch = u.id.toLowerCase().includes(term);
    if (nameMatch || usernameMatch || emailMatch || idMatch) return true;

    // Also check if any child matches search
    const children = referredMap[u.id] || [];
    return children.some(child => matchesSearch(child));
  };

  const filteredRootUsers = rootUsers.filter(r => matchesSearch(r));

  const renderTree = (userId: string, depth = 0) => {
    const referredUsers = referredMap[userId] || [];
    if (referredUsers.length === 0) return null;

    const isExpanded = expandedNodes[userId] !== false; // Default expanded unless explicitly false
    if (!isExpanded) return null;

    return (
      <ul className={depth > 0 ? "pl-6 mt-3 space-y-3 border-l-2 border-purple-500/20" : "mt-3 space-y-3"}>
        {referredUsers.map(u => {
          const hasChildren = referredMap[u.id] && referredMap[u.id].length > 0;
          const isNodeExpanded = expandedNodes[u.id] !== false;

          return (
            <li key={u.id} className="relative">
              <div className="flex items-center gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-all shadow-sm">
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(u.id)}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                  >
                    {isNodeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <div className="w-6 h-6 flex items-center justify-center text-zinc-600 text-xs">
                    •
                  </div>
                )}

                <FirebaseImage
                  fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                  src={u.image || ''}
                  alt=""
                  className="w-8 h-8 rounded-full bg-zinc-800 object-cover shrink-0 border border-zinc-700/40"
                />

                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white flex items-center gap-2 truncate">
                      <span>{u.name || u.username || 'Anonymous'}</span>
                      {u.premium && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      @{u.username || 'user'} • <span className="text-zinc-500 font-mono text-[11px]">{u.id}</span>
                    </div>
                  </div>

                  {hasChildren && (
                    <span className="text-xs px-2.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-full font-bold border border-purple-500/20 shrink-0">
                      Referred {referredMap[u.id].length} user(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Recursively render children */}
              {renderTree(u.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
            <Share2 className="w-8 h-8 text-purple-400" />
            Referral Chains & Tree Registry
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Analyze multi-tier referral trees, viral user growth, and top community connectors.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchUsers}
          disabled={loading}
          className="border-zinc-800 bg-[#18181A] hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#18181A] border border-purple-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-purple-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block">Active Referral Chains</span>
              <span className="text-3xl font-black font-display text-purple-300 mt-1 block">{rootUsers.length.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 text-purple-400">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-purple-400/80 mt-3">Root trees created</p>
        </div>

        <div className="bg-[#18181A] border border-cyan-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-cyan-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">Total Referred Users</span>
              <span className="text-3xl font-black font-display text-cyan-300 mt-1 block">{totalReferredAccounts.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-3">Joined via invitation link</p>
        </div>

        <div className="bg-[#18181A] border border-amber-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-amber-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Top Community Connectors</span>
              <span className="text-3xl font-black font-display text-amber-300 mt-1 block">{topReferrersCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-3">Has referred 1+ user</p>
        </div>
      </div>

      {/* Main Referral Tree Container */}
      <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 md:p-6 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="border-zinc-700 bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-800"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="border-zinc-700 bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-800"
            >
              Collapse All
            </Button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by username, email, or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Trees Listing */}
        <div className="p-4 md:p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span>Building referral tree structure...</span>
            </div>
          ) : filteredRootUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No referral chains found matching "{searchTerm}".
            </div>
          ) : (
            filteredRootUsers.map(rootUser => {
              const directCount = referredMap[rootUser.id]?.length || 0;
              const isExpanded = expandedNodes[rootUser.id] !== false;

              return (
                <div key={rootUser.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-3">
                  {/* Root Node Card Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(rootUser.id)}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-purple-400" /> : <ChevronRight className="w-5 h-5 text-purple-400" />}
                      </button>

                      <FirebaseImage
                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rootUser.id}`}
                        src={rootUser.image || ''}
                        alt=""
                        className="w-10 h-10 rounded-full bg-zinc-800 object-cover shrink-0 border-2 border-purple-500/40"
                      />

                      <div>
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          <span className={rootUser.referrerId ? "text-orange-400" : "text-purple-300"}>
                            {rootUser.name || rootUser.username || 'Anonymous'}
                          </span>
                          {rootUser.premium && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PRO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          @{rootUser.username || 'user'} • <span className="text-zinc-500 font-mono text-[11px]">{rootUser.id}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-extrabold px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      {directCount} Direct Referral(s)
                    </span>
                  </div>

                  {/* Child tree */}
                  {isExpanded && renderTree(rootUser.id)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
