import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Copy, Check, MapPin, Truck } from 'lucide-react';
import { extractShippingAddress, extractOrderItemDetails } from './AuditLogsHub';

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyAddress = (orderId: string, addressText: string) => {
    if (!addressText) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addressText);
      }
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
    setCopiedOrderId(orderId);
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const res = await fetch('/api/admin/orders', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            setOrders(data.orders);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to client Firestore query if API request fails or is unauthenticated
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(docs);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const res = await fetch('/api/admin/orders/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ orderId, status: newStatus })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            return;
          }
        }
      }

      // Fallback to client updateDoc
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: Date.now() });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Merch Orders</h2>
        <Button variant="outline" onClick={fetchOrders}>Refresh</Button>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6">
        {errorMsg && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4 whitespace-pre-wrap">
            {errorMsg.includes('permissions') ? (
              <>
                <strong>Permission Denied.</strong> You are using a custom Firebase project. Please go to your Firebase Console -&gt; Firestore Database -&gt; Rules, and add the following rule inside the match /databases/&#123;database&#125;/documents block:
                <br /><br />
                <pre className="bg-black/50 p-2 rounded text-xs text-red-100">
                  match /orders/&#123;orderId&#125; &#123;
                    allow read, write: if isAdmin();
                  &#125;
                </pre>
              </>
            ) : (
              errorMsg
            )}
          </div>
        )}
        {loading && orders.length === 0 ? (
          <p className="text-zinc-400">Loading orders...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Item & Details</th>
                  <th className="px-4 py-3 min-w-[260px]">Full Shipping Address</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const shipping = extractShippingAddress(order);
                  const itemDetails = extractOrderItemDetails(order);
                  const hasAddress = Boolean(shipping.recipientName || shipping.addressLine1 || shipping.city);
                  const isCopied = copiedOrderId === order.id;

                  return (
                    <tr key={order.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-300 font-mono text-xs">
                        <div>{new Date(order.createdAt).toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {order.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-200">{order.userEmail || 'Anonymous'}</div>
                        <div className="font-mono text-xs text-zinc-500">{order.userId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-emerald-400 font-semibold">{itemDetails.itemName}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {itemDetails.size && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px] font-medium text-zinc-200">
                              <span className="text-zinc-400 text-[10px]">Size:</span>
                              <span className="font-bold text-amber-300">{itemDetails.size}</span>
                            </span>
                          )}
                          {itemDetails.color && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px] font-medium text-zinc-200">
                              <span className="text-zinc-400 text-[10px]">Color:</span>
                              <span className="font-bold text-cyan-300">{itemDetails.color}</span>
                            </span>
                          )}
                          {itemDetails.quantity > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 text-[11px] font-semibold text-zinc-300">
                              Qty: {itemDetails.quantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {hasAddress ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                {shipping.recipientName || 'Recipient'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyAddress(order.id, shipping.fullAddress)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 border border-zinc-700 transition-colors"
                                title="Copy full shipping address"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-zinc-400" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="text-zinc-300 pl-5 leading-snug">
                              <div>
                                {shipping.addressLine1}
                                {shipping.addressLine2 ? `, ${shipping.addressLine2}` : ''}
                              </div>
                              <div className="text-zinc-400">
                                {[shipping.city, shipping.state].filter(Boolean).join(', ')} {shipping.zip}
                                {shipping.country && (
                                  <span className="ml-1.5 text-[10px] font-semibold uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                    {shipping.country}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic text-xs">No info</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${order.status === 'SHIPPED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {order.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.status !== 'SHIPPED' && (
                          <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Mark Shipped
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && !loading && (
              <div className="text-center py-8 text-zinc-500">No orders found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
