import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
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
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Shipping Info</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-200">{order.userEmail}</div>
                      <div className="font-mono text-xs text-zinc-500">{order.userId}</div>
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">
                      {order.itemName}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {order.shippingInfo ? (
                        <div className="whitespace-pre-wrap text-xs">
                          {order.shippingInfo.name}
                          <br />
                          {order.shippingInfo.addressLine1} {order.shippingInfo.addressLine2}
                          <br />
                          {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.zip}
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic">No info</span>
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
                ))}
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
