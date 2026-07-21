import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Search, Edit, Trash2 } from "lucide-react";

export function GenericTable({ collectionName }: { collectionName: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, collectionName));
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionName]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, collectionName, id));
    fetchData();
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading {collectionName}...</div>;

  const headers = data.length > 0 ? Array.from(new Set(data.flatMap(d => Object.keys(d)))) : [];

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">{collectionName} ({data.length})</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input type="text" placeholder="Search..." className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-zinc-700 w-64" />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                {headers.map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                  {headers.map((h: string) => (
                    <td key={h} className="px-4 py-3 max-w-[200px] truncate text-zinc-300">
                      {typeof row[h] === 'object' && row[h] !== null ? JSON.stringify(row[h]) : String(row[h])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    {collectionName === 'picks' && (
                      <Link to={`/admin/picks/edit/${row.id}`} className="text-zinc-500 hover:text-white mr-3 inline-block">
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    <button onClick={() => handleDelete(row.id)} className="text-red-500/70 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
