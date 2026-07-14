import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, Plus, Users } from 'lucide-react';

interface Bracket {
  id: string;
  name: string;
  sport: string;
  isPublic: boolean;
  maxEntries: number;
  status: string;
}

export default function BracketsList() {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBrackets = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'brackets'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bracket[];
      setBrackets(data);
    } catch (err) {
      console.error('Failed to fetch brackets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrackets();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bracket?')) return;
    try {
      await deleteDoc(doc(db, 'brackets', id));
      setBrackets(brackets.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bracket', err);
      alert('Error deleting bracket');
    }
  };

  if (loading) {
    return <div className="p-6 text-zinc-400">Loading brackets...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Brackets Management</h2>
        <Button onClick={() => navigate('/admin/brackets/create')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" />
          Create Bracket
        </Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#18181A] border-b border-zinc-800 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Sport</th>
              <th className="px-6 py-4 font-medium">Visibility</th>
              <th className="px-6 py-4 font-medium">Max Entries</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {brackets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No brackets found. Create one to get started.
                </td>
              </tr>
            ) : (
              brackets.map(bracket => (
                <tr key={bracket.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 text-zinc-200 font-medium">{bracket.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{bracket.sport}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${bracket.isPublic ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                      {bracket.isPublic ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {bracket.maxEntries > 0 ? bracket.maxEntries : 'Unlimited'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/brackets/entries/${bracket.id}`)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                        title="View Entries"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/brackets/edit/${bracket.id}`)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        title="Edit Bracket"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bracket.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
