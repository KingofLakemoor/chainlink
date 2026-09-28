import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { useEmailAggregator, EmailRecord } from './useEmailAggregator';
import {
  Mail, Search, Copy, Check, Filter, RefreshCw, Layers, Users,
  CheckCircle2, Sparkles, FileText, Database, Code2
} from 'lucide-react';

const DEV_MOCK_PLAYERS = [
  { email: 'john.doe@example.com', name: 'John Doe', level: 'PRO', role: 'USER' },
  { email: 'jane.smith@example.com', name: 'Jane Smith', level: 'VIP', role: 'USER' },
  { email: 'admin@chainlink.app', name: 'Admin User', level: 'ADMIN', role: 'ADMIN' },
  { email: 'alex.rivera@example.com', name: 'Alex Rivera', level: 'Standard', role: 'USER' },
  { email: 'sam.taylor@example.com', name: 'Sam Taylor', level: 'PRO', role: 'USER' }
];

const DEV_MOCK_ORDERS = [
  { customer_email: 'jane.smith@example.com', customer_name: 'Jane Smith' },
  { customer_email: 'charlie.brown@example.com', customer_name: 'Charlie Brown' },
  { customer_email: 'sam.taylor@example.com', customer_name: 'Sam Taylor' },
  { customer_email: 'orders.test@example.com', customer_name: 'Order Customer' }
];

const DEV_MOCK_COORDINATORS = [
  { email: 'admin@chainlink.app', name: 'Admin User', role: 'ADMIN' },
  { email: 'coord.mike@example.com', name: 'Mike Coordinator', role: 'COORDINATOR' },
  { email: 'john.doe@example.com', name: 'John Doe', role: 'COORDINATOR' }
];

export default function EmailBlastAdminPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Formatting state
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [delimiter, setDelimiter] = useState<', ' | '; ' | '\n'>(', ');
  const [recipientFormat, setRecipientFormat] = useState<'EMAIL_ONLY' | 'NAME_EMAIL'>('EMAIL_ONLY');

  // Notification / Toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedRowEmail, setCopiedRowEmail] = useState<string | null>(null);

  const fetchSourceData = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();

      let fetchedPlayers: any[] = [];
      let fetchedOrders: any[] = [];
      let fetchedCoordinators: any[] = [];

      if (token) {
        // Try REST API for users
        try {
          const res = await fetch('/api/admin/users?limit=500', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.users)) {
            fetchedPlayers = data.users;
            fetchedCoordinators = data.users.filter((u: any) => u.role === 'ADMIN' || u.role === 'COORDINATOR');
          }
        } catch (e) {
          console.warn('API fetch users fallback to client SDK:', e);
        }

        // Try REST API for merch orders
        try {
          const res = await fetch('/api/admin/orders', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.orders)) {
            fetchedOrders = data.orders;
          }
        } catch (e) {
          console.warn('API fetch orders fallback to client SDK:', e);
        }
      }

      // Firestore Fallback if REST API was empty or unconfigured
      if (fetchedPlayers.length === 0) {
        try {
          const snap = await getDocs(query(collection(db, 'users'), limit(500)));
          fetchedPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          fetchedCoordinators = fetchedPlayers.filter((u: any) => u.role === 'ADMIN' || u.role === 'COORDINATOR');
        } catch (e) {
          console.warn('Firestore fetch users error:', e);
        }
      }

      if (fetchedOrders.length === 0) {
        try {
          const snap = await getDocs(query(collection(db, 'orders'), limit(300)));
          fetchedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('Firestore fetch orders error:', e);
        }
      }

      // Merge mock data if empty
      setPlayers(fetchedPlayers.length > 0 ? fetchedPlayers : DEV_MOCK_PLAYERS);
      setOrders(fetchedOrders.length > 0 ? fetchedOrders : DEV_MOCK_ORDERS);
      setCoordinators(fetchedCoordinators.length > 0 ? fetchedCoordinators : DEV_MOCK_COORDINATORS);

    } catch (e) {
      console.error('Failed to load email blast source collections:', e);
      setPlayers(DEV_MOCK_PLAYERS);
      setOrders(DEV_MOCK_ORDERS);
      setCoordinators(DEV_MOCK_COORDINATORS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSourceData();
  }, []);

  // Aggregated email records using custom hook
  const allRecords = useEmailAggregator({ players, orders, coordinators });

  // Extract unique levels/categories for filter dropdown
  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.level) set.add(r.level);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  // Filtered email records
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      // Source filter
      if (sourceFilter !== 'ALL' && !record.sources.includes(sourceFilter)) {
        return false;
      }

      // Level filter
      if (levelFilter !== 'ALL' && record.level !== levelFilter) {
        return false;
      }

      // Free text search across name & email address
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesEmail = record.email.includes(term);
        const matchesName = record.name.toLowerCase().includes(term);
        if (!matchesEmail && !matchesName) return false;
      }

      return true;
    });
  }, [allRecords, sourceFilter, levelFilter, searchTerm]);

  // Formatted string output
  const formattedOutputText = useMemo(() => {
    return filteredRecords
      .map(record => {
        if (recipientFormat === 'NAME_EMAIL' && record.name && record.name !== 'N/A') {
          return `${record.name} <${record.email}>`;
        }
        return record.email;
      })
      .join(delimiter);
  }, [filteredRecords, recipientFormat, delimiter]);

  // Clipboard copy handler with cross-browser fallback
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const handleCopy = async (textToCopy: string, count: number) => {
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      showToast(`Copied ${count} emails to clipboard!`);
    } catch (err) {
      // Cross-browser fallback using temporary textarea selection
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      if (typeof document.execCommand === 'function') {
        document.execCommand('copy');
      }
      document.body.removeChild(textArea);
      showToast(`Copied ${count} emails to clipboard!`);
    }
  };

  const handleCopySingleRow = (record: EmailRecord) => {
    const formattedStr = recipientFormat === 'NAME_EMAIL' && record.name && record.name !== 'N/A'
      ? `${record.name} <${record.email}>`
      : record.email;

    handleCopy(formattedStr, 1);
    setCopiedRowEmail(record.email);
    setTimeout(() => setCopiedRowEmail(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-zinc-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-zinc-950" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-3">
            <Mail className="w-7 h-7 text-cyan-400" />
            Email Blast & Recipient Extractor
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Extract, deduplicate, filter, and format registered emails across all platform collections for marketing or announcements.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSourceData} disabled={loading} className="text-zinc-300 border-zinc-700 hover:bg-zinc-800">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Sources
        </Button>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#18181A] border border-cyan-500/30 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">Filtered Unique Emails</div>
            <div className="text-2xl font-bold text-white font-display">{filteredRecords.length} Unique Emails</div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Aggregated</div>
            <div className="text-2xl font-bold text-white font-display">{allRecords.length}</div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Data Collections</div>
            <div className="text-2xl font-bold text-white font-display">3 Sources</div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Categories / Tiers</div>
            <div className="text-2xl font-bold text-white font-display">{availableLevels.length}</div>
          </div>
        </div>
      </div>

      {/* Filter and Format Controls */}
      <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400 tracking-wider">
          <Filter className="w-4 h-4 text-cyan-400" /> Filter & Formatting Options
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="lg:col-span-1">
            <label className="block text-xs text-zinc-400 mb-1">Search Recipient</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Data Source Collection</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Sources (Merged)</option>
              <option value="Player">Players / Registered Users</option>
              <option value="Commerce">Commerce / Orders</option>
              <option value="Coordinator">Coordinators / Admins</option>
            </select>
          </div>

          {/* Category / Division Filter */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Division / Role / Tier</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Levels / Tiers</option>
              {availableLevels.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Delimiter Selector */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Delimiter / Separator</label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 font-mono"
            >
              <option value=", ">Comma ( , )</option>
              <option value="; ">Semicolon ( ; )</option>
              <option value="\n">Newline ( \n )</option>
            </select>
          </div>

          {/* Recipient Format Selector */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Recipient Format</label>
            <select
              value={recipientFormat}
              onChange={(e) => setRecipientFormat(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
            >
              <option value="EMAIL_ONLY">Email Address Only</option>
              <option value="NAME_EMAIL">Full Name & Email</option>
            </select>
          </div>
        </div>
      </div>

      {/* Copy-Ready Formatted Textarea Output */}
      <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Copy-Ready Formatted Output String
            <span className="text-xs font-normal text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700">
              {filteredRecords.length} recipients
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => handleCopy(formattedOutputText, filteredRecords.length)}
            disabled={filteredRecords.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-bold text-xs"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Copy All {filteredRecords.length} Emails
          </Button>
        </div>

        <textarea
          readOnly
          rows={5}
          value={formattedOutputText}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          placeholder="No matching emails found..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/50 selection:bg-emerald-500/30 cursor-pointer custom-scrollbar resize-y"
        />
        <div className="text-[11px] text-zinc-500 italic flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Tip: Click inside the box to highlight all text immediately, or press "Copy All" for one-click clipboard copying.
        </div>
      </div>

      {/* Details Table */}
      <div className="bg-[#18181A] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Normalized Email Records ({filteredRecords.length})
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Aggregating database sources...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No records match the active filter criteria.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/60 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Recipient Name</th>
                  <th className="py-3 px-4">Category / Level</th>
                  <th className="py-3 px-4">Sources Tagged</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredRecords.map((record, idx) => (
                  <tr key={record.email} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 text-center text-xs font-mono text-zinc-500">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-zinc-200">
                      {record.email}
                    </td>

                    <td className="py-3 px-4 text-xs font-medium text-white">
                      {record.name}
                    </td>

                    <td className="py-3 px-4">
                      {record.level ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {record.level}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {record.sources.map(src => (
                          <span
                            key={src}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                              src === 'Player'
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                : src === 'Commerce'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopySingleRow(record)}
                        className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
                      >
                        {copiedRowEmail === record.email ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                            Copy
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
