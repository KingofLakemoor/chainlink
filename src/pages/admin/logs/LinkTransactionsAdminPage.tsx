import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

export default function LinkTransactionsAdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreBackend, setHasMoreBackend] = useState<boolean>(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async (loadMore = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const url = new URL('/api/admin/link-transactions', window.location.origin);
        if (searchUsername) {
          url.searchParams.set('username', searchUsername);
        }
        if (loadMore && logs.length > 0) {
          const lastLog = logs[logs.length - 1];
          if (lastLog?.id) {
            url.searchParams.set('startAfterId', lastLog.id);
          }
        }
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.logs)) {
            if (loadMore) {
              setLogs(prev => [...prev, ...data.logs]);
            } else {
              setLogs(data.logs);
            }
            setHasMoreBackend(data.hasMore ?? (data.logs.length === 100));
            setLastDoc(null);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to client Firestore query if API call is unauthenticated or fails
      let q;
      if (searchUsername) {
         q = query(collection(db, 'linkTransactions'), where('username', '==', searchUsername), orderBy('createdAt', 'desc'), limit(100));
         if (loadMore && lastDoc) {
           q = query(collection(db, 'linkTransactions'), where('username', '==', searchUsername), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(100));
         }
      } else {
         q = query(collection(db, 'linkTransactions'), orderBy('createdAt', 'desc'), limit(100));
         if (loadMore && lastDoc) {
           q = query(collection(db, 'linkTransactions'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(100));
         }
      }
      
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      if (loadMore) {
        setLogs(prev => [...prev, ...docs]);
      } else {
        setLogs(docs);
      }
      setHasMoreBackend(false);
      
      if (!snap.empty) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
      } else {
        setLastDoc(null);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (val: any) => {
    if (!val) return 'Unknown';
    if (typeof val === 'number') return new Date(val).toLocaleString();
    if (typeof val === 'string') return new Date(val).toLocaleString();
    if (val.seconds) return new Date(val.seconds * 1000).toLocaleString();
    return 'Unknown';
  };

  const showLoadMore = hasMoreBackend || (lastDoc !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Link Transactions Log</h2>
        <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search username..." 
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs(false)}
            />
            <Button variant="outline" onClick={() => fetchLogs(false)}>Search / Refresh</Button>
        </div>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6">
        {errorMsg && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4 whitespace-pre-wrap">
            {errorMsg.includes('requires an index') ? (
              <>
                This query requires a database index. Please open the console and click the link to create it, or use this link if visible in the error: {errorMsg}
              </>
            ) : errorMsg.includes('permissions') ? (
              <>
                <strong>Permission Denied.</strong> You are using a custom Firebase project or test role. Accessing backend log endpoints requires an authenticated Admin session.
              </>
            ) : (
              errorMsg
            )}
          </div>
        )}
        {loading && logs.length === 0 ? (
          <p className="text-zinc-400">Loading logs...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-200">{log.username || 'Unknown'}</div>
                      <div className="font-mono text-xs text-zinc-500">{log.userId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-zinc-700 px-2 py-1 rounded text-xs font-semibold text-zinc-200">
                        {log.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold ${log.amount > 0 ? 'text-emerald-400' : log.amount < 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && !loading && (
              <div className="text-center py-8 text-zinc-500">No transactions found.</div>
            )}
            {logs.length > 0 && showLoadMore && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => fetchLogs(true)} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
