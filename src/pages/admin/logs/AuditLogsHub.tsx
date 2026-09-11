import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, limit, getDocs, startAfter,
  QueryDocumentSnapshot, where, doc, updateDoc, onSnapshot, deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import {
  FileText, ShoppingCart, AlertTriangle, ArrowUpDown, Download,
  CheckCircle, Clock, Search, Calendar, Filter, Truck, ExternalLink, RefreshCw
} from 'lucide-react';

export function getTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return new Date(val).getTime();
  if (val.seconds) return val.seconds * 1000;
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  return 0;
}

export function formatDateStr(val: any): string {
  const ms = getTimestampMs(val);
  if (!ms) return 'Unknown';
  return new Date(ms).toLocaleString();
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          else if (typeof val === 'object') val = JSON.stringify(val);
          else val = String(val);
          val = val.replace(/"/g, '""');
          if (val.includes(',') || val.includes('\n') || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AuditLogsHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path or search param
  const activeTab = useMemo<'transactions' | 'orders' | 'errors'>(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/errors')) return 'errors';
    if (path.includes('/transactions')) return 'transactions';

    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab')?.toLowerCase();
    if (tabParam === 'orders') return 'orders';
    if (tabParam === 'errors') return 'errors';
    return 'transactions';
  }, [location.pathname, location.search]);

  const handleTabChange = (tab: 'transactions' | 'orders' | 'errors') => {
    navigate(`/admin/logs/${tab}`);
  };

  // Shared Date Range & Filter State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const applyPreset = (preset: 'all' | '7days' | '30days') => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
    }
  };

  // Helper check if timestamp falls within date range
  const isWithinDateRange = (tsMs: number) => {
    if (!tsMs) return true;
    if (startDate) {
      const startMs = new Date(`${startDate}T00:00:00`).getTime();
      if (!isNaN(startMs) && tsMs < startMs) return false;
    }
    if (endDate) {
      const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
      if (!isNaN(endMs) && tsMs > endMs) return false;
    }
    return true;
  };

  // ==========================================
  // TAB 1: LINK TRANSACTIONS LOGIC
  // ==========================================
  const [txLogs, setTxLogs] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txLastDoc, setTxLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [txHasMoreBackend, setTxHasMoreBackend] = useState<boolean>(false);
  const [txErrorMsg, setTxErrorMsg] = useState<string | null>(null);

  const fetchTxLogs = async (loadMore = false) => {
    setTxLoading(true);
    setTxErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const url = new URL('/api/admin/link-transactions', window.location.origin);
        if (searchTerm) {
          url.searchParams.set('username', searchTerm);
        }
        if (loadMore && txLogs.length > 0) {
          const lastLog = txLogs[txLogs.length - 1];
          if (lastLog?.id) {
            url.searchParams.set('startAfterId', lastLog.id);
          }
        }
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.logs)) {
            if (loadMore) {
              setTxLogs(prev => [...prev, ...data.logs]);
            } else {
              setTxLogs(data.logs);
            }
            setTxHasMoreBackend(data.hasMore ?? (data.logs.length === 100));
            setTxLastDoc(null);
            setTxLoading(false);
            return;
          }
        }
      }

      // Client Firestore Fallback
      let q;
      if (searchTerm) {
        q = query(collection(db, 'linkTransactions'), where('username', '==', searchTerm), orderBy('createdAt', 'desc'), limit(100));
        if (loadMore && txLastDoc) {
          q = query(collection(db, 'linkTransactions'), where('username', '==', searchTerm), orderBy('createdAt', 'desc'), startAfter(txLastDoc), limit(100));
        }
      } else {
        q = query(collection(db, 'linkTransactions'), orderBy('createdAt', 'desc'), limit(100));
        if (loadMore && txLastDoc) {
          q = query(collection(db, 'linkTransactions'), orderBy('createdAt', 'desc'), startAfter(txLastDoc), limit(100));
        }
      }

      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      if (loadMore) {
        setTxLogs(prev => [...prev, ...docs]);
      } else {
        setTxLogs(docs);
      }
      setTxHasMoreBackend(false);
      if (!snap.empty) {
        setTxLastDoc(snap.docs[snap.docs.length - 1]);
      } else {
        setTxLastDoc(null);
      }
    } catch (e: any) {
      console.error('Fetch Link Transactions error:', e);
      setTxErrorMsg(e.message);
    } finally {
      setTxLoading(false);
    }
  };

  // Filtered transactions based on date range & local search
  const filteredTxLogs = useMemo(() => {
    return txLogs.filter(log => {
      const ts = getTimestampMs(log.createdAt);
      if (!isWithinDateRange(ts)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const username = (log.username || '').toLowerCase();
        const userId = (log.userId || '').toLowerCase();
        const type = (log.type || '').toLowerCase();
        const desc = (log.description || '').toLowerCase();
        if (!username.includes(term) && !userId.includes(term) && !type.includes(term) && !desc.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [txLogs, startDate, endDate, searchTerm]);

  // Transaction KPI Breakdown
  const txMetrics = useMemo(() => {
    let totalPositive = 0;
    let totalNegative = 0;
    const typeCounts: Record<string, number> = {};

    filteredTxLogs.forEach(log => {
      const amt = Number(log.amount) || 0;
      if (amt > 0) totalPositive += amt;
      else if (amt < 0) totalNegative += Math.abs(amt);

      const type = log.type || 'OTHER';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const netLinks = totalPositive - totalNegative;
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

    return {
      count: filteredTxLogs.length,
      netLinks,
      totalPositive,
      totalNegative,
      sortedTypes
    };
  }, [filteredTxLogs]);

  // ==========================================
  // TAB 2: MERCH ORDERS LOGIC
  // ==========================================
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErrorMsg, setOrdersErrorMsg] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'SHIPPED'>('ALL');
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const res = await fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            setOrders(data.orders);
            // Pre-fill tracking inputs
            const map: Record<string, string> = {};
            data.orders.forEach((o: any) => {
              if (o.trackingNumber) map[o.id] = o.trackingNumber;
            });
            setTrackingInputs(map);
            setOrdersLoading(false);
            return;
          }
        }
      }

      // Fallback to client Firestore query
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(docs);
      const map: Record<string, string> = {};
      docs.forEach((o: any) => {
        if (o.trackingNumber) map[o.id] = o.trackingNumber;
      });
      setTrackingInputs(map);
    } catch (e: any) {
      console.error('Fetch Orders error:', e);
      setOrdersErrorMsg(e.message);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setSavingOrderId(orderId);
    const trackingNumber = trackingInputs[orderId] || '';
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const res = await fetch('/api/admin/orders/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ orderId, status: newStatus, trackingNumber })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, trackingNumber } : o));
            setSavingOrderId(null);
            return;
          }
        }
      }

      // Fallback to client updateDoc
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus, trackingNumber, updatedAt: Date.now() });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, trackingNumber } : o));
    } catch (e) {
      console.error('Failed to update status:', e);
      alert('Failed to update order status');
    } finally {
      setSavingOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const ts = getTimestampMs(o.createdAt);
      if (!isWithinDateRange(ts)) return false;
      if (orderStatusFilter !== 'ALL' && (o.status || 'PENDING') !== orderStatusFilter) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const email = (o.userEmail || '').toLowerCase();
        const userId = (o.userId || '').toLowerCase();
        const item = (o.itemName || '').toLowerCase();
        const tracking = (o.trackingNumber || '').toLowerCase();
        const name = (o.shippingInfo?.name || '').toLowerCase();
        if (!email.includes(term) && !userId.includes(term) && !item.includes(term) && !tracking.includes(term) && !name.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, startDate, endDate, orderStatusFilter, searchTerm]);

  const ordersMetrics = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter(o => (o.status || 'PENDING') === 'PENDING').length;
    const shipped = filteredOrders.filter(o => o.status === 'SHIPPED').length;
    const fulfillmentRate = total > 0 ? Math.round((shipped / total) * 100) : 0;

    return { total, pending, shipped, fulfillmentRate };
  }, [filteredOrders]);

  // ==========================================
  // TAB 3: SYSTEM ERRORS LOGIC
  // ==========================================
  const [systemErrors, setSystemErrors] = useState<any[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'system_errors'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setSystemErrors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setErrorsLoading(false);
    }, (err) => {
      console.warn('System Errors ordered query failed, fallback to unordered query:', err);
      const fallbackQ = query(collection(db, 'system_errors'), limit(100));
      onSnapshot(fallbackQ, (fallbackSnap) => {
        const items = fallbackSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        items.sort((a, b) => {
          const timeA = getTimestampMs(a.timestamp);
          const timeB = getTimestampMs(b.timestamp);
          return timeB - timeA;
        });
        setSystemErrors(items);
        setErrorsLoading(false);
      }, (fallbackErr) => {
        console.error('System Errors fallback error:', fallbackErr);
        setErrorsLoading(false);
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

  const dismissAllErrors = async () => {
    if (!window.confirm('Are you sure you want to resolve all currently visible errors?')) return;
    for (const err of filteredErrors) {
      await dismissError(err.id);
    }
  };

  const filteredErrors = useMemo(() => {
    return systemErrors.filter(err => {
      const ts = getTimestampMs(err.timestamp);
      if (!isWithinDateRange(ts)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const ctx = (err.context || '').toLowerCase();
        const msg = (err.message || '').toLowerCase();
        const url = (err.url || '').toLowerCase();
        if (!ctx.includes(term) && !msg.includes(term) && !url.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [systemErrors, startDate, endDate, searchTerm]);

  const errorsMetrics = useMemo(() => {
    const total = filteredErrors.length;
    const contextCounts: Record<string, number> = {};
    let latestTs = 0;

    filteredErrors.forEach(e => {
      const ctx = e.context || 'UNKNOWN';
      contextCounts[ctx] = (contextCounts[ctx] || 0) + 1;
      const ts = getTimestampMs(e.timestamp);
      if (ts > latestTs) latestTs = ts;
    });

    const sortedContexts = Object.entries(contextCounts).sort((a, b) => b[1] - a[1]);

    return { total, contextCounts, sortedContexts, latestTs };
  }, [filteredErrors]);

  // Initial Fetch Effect for active tab
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTxLogs(false);
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (activeTab === 'transactions') {
      const exportRows = filteredTxLogs.map(log => ({
        ID: log.id,
        Date: formatDateStr(log.createdAt),
        Username: log.username || 'Unknown',
        UserID: log.userId || '',
        Type: log.type || '',
        Amount: log.amount ?? 0,
        Description: log.description || ''
      }));
      exportToCSV(`link_transactions_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
    } else if (activeTab === 'orders') {
      const exportRows = filteredOrders.map(o => ({
        OrderID: o.id,
        Date: formatDateStr(o.createdAt),
        Email: o.userEmail || '',
        UserID: o.userId || '',
        Item: o.itemName || '',
        Status: o.status || 'PENDING',
        TrackingNumber: o.trackingNumber || '',
        RecipientName: o.shippingInfo?.name || '',
        Address: `${o.shippingInfo?.addressLine1 || ''} ${o.shippingInfo?.addressLine2 || ''}`.trim(),
        CityStateZip: `${o.shippingInfo?.city || ''}, ${o.shippingInfo?.state || ''} ${o.shippingInfo?.zip || ''}`.trim()
      }));
      exportToCSV(`merch_orders_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
    } else if (activeTab === 'errors') {
      const exportRows = filteredErrors.map(err => ({
        ErrorID: err.id,
        Timestamp: formatDateStr(err.timestamp),
        Context: err.context || '',
        Message: err.message || '',
        URL: err.url || '',
        UserAgent: err.userAgent || ''
      }));
      exportToCSV(`system_errors_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Hub Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-400" />
            Audit & System Logs Hub
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Centralized hub for financial transactions, merch fulfillment, and system exceptions.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap gap-2 bg-[#121212] p-1.5 border border-zinc-800 rounded-xl">
          <button
            onClick={() => handleTabChange('transactions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'transactions'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ArrowUpDown className={`w-4 h-4 ${activeTab === 'transactions' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span>Link Transactions</span>
          </button>

          <button
            onClick={() => handleTabChange('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ShoppingCart className={`w-4 h-4 ${activeTab === 'orders' ? 'text-amber-400' : 'text-zinc-500'}`} />
            <span>Merch Orders</span>
          </button>

          <button
            onClick={() => handleTabChange('errors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'errors'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'errors' ? 'text-red-400' : 'text-zinc-500'}`} />
            <span>System Errors</span>
            {systemErrors.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {systemErrors.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-zinc-400 uppercase font-semibold">Total Volume</div>
            <div className="text-2xl font-bold text-zinc-100 mt-1">{txMetrics.count}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Filtered Transactions</div>
          </div>
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-zinc-400 uppercase font-semibold">Net Links Flow</div>
            <div className={`text-2xl font-bold mt-1 ${txMetrics.netLinks >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {txMetrics.netLinks >= 0 ? '+' : ''}{txMetrics.netLinks.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              +{txMetrics.totalPositive.toLocaleString()} awarded / -{txMetrics.totalNegative.toLocaleString()} spent
            </div>
          </div>
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl sm:col-span-2">
            <div className="text-xs text-zinc-400 uppercase font-semibold mb-1">Top Transaction Categories</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {txMetrics.sortedTypes.slice(0, 5).map(([type, count]) => (
                <span key={type} className="bg-zinc-800 border border-zinc-700/50 px-2.5 py-1 rounded text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                  <span className="font-semibold text-emerald-400">{type}</span>
                  <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-bold">{count}</span>
                </span>
              ))}
              {txMetrics.sortedTypes.length === 0 && <span className="text-xs text-zinc-500">No transactions recorded</span>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-zinc-400 uppercase font-semibold">Total Orders</div>
            <div className="text-2xl font-bold text-zinc-100 mt-1">{ordersMetrics.total}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Orders in view</div>
          </div>
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-amber-400 uppercase font-semibold">Pending Fulfillment</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{ordersMetrics.pending}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Awaiting shipment</div>
          </div>
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-emerald-400 uppercase font-semibold">Shipped</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{ordersMetrics.shipped}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Completed orders</div>
          </div>
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-zinc-400 uppercase font-semibold">Fulfillment Rate</div>
            <div className="text-2xl font-bold text-zinc-100 mt-1">{ordersMetrics.fulfillmentRate}%</div>
            <div className="text-[11px] text-zinc-500 mt-1">Shipped vs Total</div>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl">
            <div className="text-xs text-red-400 uppercase font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Active System Errors
            </div>
            <div className="text-2xl font-bold text-red-400 mt-1">{errorsMetrics.total}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Unresolved exceptions</div>
          </div>
          <div className="bg-[#18181A] border border-zinc-800/80 p-4 rounded-xl sm:col-span-2">
            <div className="text-xs text-zinc-400 uppercase font-semibold mb-1">Errors by Context</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {errorsMetrics.sortedContexts.map(([context, count]) => (
                <span key={context} className="bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded text-xs font-mono text-red-300 flex items-center gap-1.5">
                  <span className="font-semibold">{context}</span>
                  <span className="bg-red-950/60 px-1.5 py-0.5 rounded text-[10px] text-red-400 font-bold">{count}</span>
                </span>
              ))}
              {errorsMetrics.sortedContexts.length === 0 && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> No active errors!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Filter Toolbar */}
      <div className="bg-[#18181A] border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Range Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none text-xs"
              placeholder="Start Date"
            />
            <span className="text-zinc-600">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none text-xs"
              placeholder="End Date"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${!startDate && !endDate ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              All Time
            </button>
            <button
              onClick={() => applyPreset('7days')}
              className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset('30days')}
              className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Search Input & Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === 'orders' && (
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="SHIPPED">Shipped Only</option>
            </select>
          )}

          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'transactions' ? "Search user, type..." :
                activeTab === 'orders' ? "Search email, item, tracking..." :
                "Search error msg, context..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'transactions' ? fetchTxLogs(false) : activeTab === 'orders' ? fetchOrders() : null)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-700"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === 'transactions') fetchTxLogs(false);
              else if (activeTab === 'orders') fetchOrders();
            }}
            className="border-zinc-800 hover:bg-zinc-800 text-zinc-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-zinc-800 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Tab Panels */}
      {/* ==========================================
          TAB 1: LINK TRANSACTIONS TABLE
          ========================================== */}
      {activeTab === 'transactions' && (
        <div className="bg-[#18181A] border border-zinc-800/80 rounded-xl p-6">
          {txErrorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4 whitespace-pre-wrap text-xs">
              {txErrorMsg.includes('permissions') ? (
                <>
                  <strong>Permission Denied.</strong> Custom Firebase project or test role detected. Admin session required.
                </>
              ) : txErrorMsg}
            </div>
          )}

          {txLoading && txLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading transaction logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxLogs.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400 font-mono">
                        {formatDateStr(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-200">{log.username || 'Unknown'}</div>
                        <div className="font-mono text-[10px] text-zinc-500">{log.userId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-zinc-800 border border-zinc-700/50 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-zinc-300">
                          {log.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold font-mono ${log.amount > 0 ? 'text-emerald-400' : log.amount < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {log.amount > 0 ? '+' : ''}{log.amount}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTxLogs.length === 0 && !txLoading && (
                <div className="text-center py-12 text-zinc-500 text-sm">No transactions found matching criteria.</div>
              )}

              {txLogs.length > 0 && (txHasMoreBackend || txLastDoc) && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={() => fetchTxLogs(true)} disabled={txLoading} size="sm">
                    {txLoading ? 'Loading...' : 'Load More Transactions'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: MERCH ORDERS TABLE WITH TRACKING INPUTS
          ========================================== */}
      {activeTab === 'orders' && (
        <div className="bg-[#18181A] border border-zinc-800/80 rounded-xl p-6">
          {ordersErrorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4 text-xs whitespace-pre-wrap">
              {ordersErrorMsg}
            </div>
          )}

          {ordersLoading && orders.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading merch orders...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Shipping Info</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tracking Number</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isShipped = order.status === 'SHIPPED';
                    const isSaving = savingOrderId === order.id;

                    return (
                      <tr key={order.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400 font-mono">
                          {formatDateStr(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-200">{order.userEmail}</div>
                          <div className="font-mono text-[10px] text-zinc-500">{order.userId}</div>
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold text-xs">
                          {order.itemName}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {order.shippingInfo ? (
                            <div className="whitespace-pre-wrap text-xs leading-relaxed">
                              <span className="font-semibold text-zinc-200">{order.shippingInfo.name}</span>
                              <br />
                              {order.shippingInfo.addressLine1} {order.shippingInfo.addressLine2}
                              <br />
                              {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.zip}
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic text-xs">No info</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isShipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {order.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="Enter tracking #"
                              value={trackingInputs[order.id] ?? ''}
                              onChange={(e) => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                              className="px-2 py-1 bg-zinc-900 border border-zinc-700/80 rounded text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono w-36"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!isShipped ? (
                              <Button
                                size="sm"
                                disabled={isSaving}
                                onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                              >
                                {isSaving ? 'Saving...' : 'Mark Shipped'}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSaving}
                                onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-7 px-2.5"
                              >
                                {isSaving ? 'Saving...' : 'Update Tracking'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredOrders.length === 0 && !ordersLoading && (
                <div className="text-center py-12 text-zinc-500 text-sm">No orders found matching criteria.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: SYSTEM ERRORS LIST
          ========================================== */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Unhandled Exceptions Queue
            </h3>
            {filteredErrors.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={dismissAllErrors}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Resolve All Visible
              </Button>
            )}
          </div>

          {errorsLoading ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading exception logs...</div>
          ) : filteredErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-[#18181A] border border-zinc-800/80 rounded-xl text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-200">System Healthy</h3>
              <p className="text-zinc-500 text-sm mt-2 max-w-sm">No unhandled system errors currently logged matching filter criteria.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredErrors.map((err) => (
                <div key={err.id} className="bg-[#18181A] border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="flex items-start justify-between p-4 border-b border-zinc-800/50 bg-red-500/5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                          {err.context || 'UNKNOWN'}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {formatDateStr(err.timestamp)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100 font-mono mt-1 break-all">{err.message}</h3>
                      {err.url && (
                        <div className="text-xs text-zinc-400 font-mono truncate max-w-full flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-zinc-500" /> {err.url}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => dismissError(err.id)}
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50"
                      title="Resolve Error"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                  {err.stack && (
                    <div className="p-4 bg-[#121212] overflow-x-auto">
                      <pre className="text-[11px] text-zinc-500 font-mono whitespace-pre-wrap leading-relaxed">{err.stack}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
