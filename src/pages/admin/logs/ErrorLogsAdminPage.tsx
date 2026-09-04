import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SystemError {
  id: string;
  context: string;
  message: string;
  stack: string;
  timestamp: any;
  userAgent: string;
  url: string;
}

export default function ErrorLogsAdminPage() {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'system_errors'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setErrors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemError)));
      setLoading(false);
    }, (err) => {
      console.warn("ErrorLogsAdminPage ordered query failed, falling back to unordered query:", err);
      const fallbackQ = query(collection(db, 'system_errors'), limit(100));
      onSnapshot(fallbackQ, (fallbackSnap) => {
        const items = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemError));
        items.sort((a, b) => {
          const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || 0).getTime();
          const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        setErrors(items);
        setLoading(false);
      }, (fallbackErr) => {
        console.error("ErrorLogsAdminPage fallback snapshot error:", fallbackErr);
        setLoading(false);
      });
    });
    return () => unsub();
  }, []);

  const dismissError = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'system_errors', id));
    } catch (e) {
      console.error('Failed to dismiss error', e);
    }
  };

  const dismissAll = async () => {
    if (!window.confirm("Are you sure you want to resolve all currently visible errors?")) return;
    for (const error of errors) {
      await dismissError(error.id);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'Unknown';
    if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
    if (typeof ts === 'number') return new Date(ts).toLocaleString();
    if (typeof ts === 'string') return new Date(ts).toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return 'Unknown';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-100 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            System Errors
          </h1>
          <p className="text-zinc-400 mt-2">Monitor and resolve unhandled exceptions and crashes.</p>
        </div>
        {errors.length > 0 && (
          <button 
            onClick={dismissAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors border border-zinc-700"
          >
            <CheckCircle className="w-4 h-4" />
            Resolve All
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-zinc-500">Loading error queue...</div>
      ) : errors.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[#18181A] border border-zinc-800/50 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-200">Inbox Zero</h3>
          <p className="text-zinc-500 mt-2 max-w-sm">No unhandled errors are currently logged. The system is healthy.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {errors.map(err => (
            <div key={err.id} className="bg-[#18181A] border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex items-start justify-between p-4 border-b border-zinc-800/50 bg-red-500/5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                      {err.context}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(err.timestamp)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 font-mono mt-1 break-all">{err.message}</h3>
                  <div className="text-xs text-zinc-400 font-mono truncate max-w-full">
                    {err.url}
                  </div>
                </div>
                <button
                  onClick={() => dismissError(err.id)}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                  title="Resolve Error"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
              {err.stack && (
                <div className="p-4 bg-[#121212] overflow-x-auto">
                  <pre className="text-[11px] text-zinc-500 font-mono whitespace-pre-wrap">{err.stack}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
