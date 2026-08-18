import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

export default function LinkTransactionsAdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [searchUsername, setSearchUsername] = useState('');

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async (loadMore = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
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
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (loadMore) {
        setLogs(prev => [...prev, ...docs]);
      } else {
        setLogs(docs);
      }
      
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
                      {new Date(log.createdAt).toLocaleString()}
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
            {logs.length > 0 && lastDoc && (
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
