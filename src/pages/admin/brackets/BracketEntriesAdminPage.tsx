import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { WorldCupBracket } from '../../brackets/WorldCupBracket';

export default function BracketEntriesAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bracket, setBracket] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const bDoc = await getDoc(doc(db, 'brackets', id));
        if (bDoc.exists()) {
          setBracket({ id: bDoc.id, ...bDoc.data() });
        }

        const pQuery = query(collection(db, 'bracketGamePredictions'), where('bracketId', '==', id));
        const pSnap = await getDocs(pQuery);
        
        const userPromises = pSnap.docs.map(async (d) => {
          const data = d.data();
          const uid = data.userId || d.id.split('_')[1];
          let userName = 'Unknown';
          let userAvatar = '/icons/icon-256x256.png';
          try {
             const uDoc = await getDoc(doc(db, 'users', uid));
             if (uDoc.exists()) {
               userName = uDoc.data().name || 'Unknown';
               if (uDoc.data().image) userAvatar = uDoc.data().image;
             }
          } catch (e) {}
          
          return {
            id: d.id,
            userId: uid,
            userName,
            userAvatar,
            paid: data.paid,
            updatedAt: data.updatedAt,
            selections: data.selections || {}
          };
        });

        const loadedEntries = await Promise.all(userPromises);
        setEntries(loadedEntries);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
  }

  if (!bracket) {
    return <div className="p-8 text-red-500">Bracket not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/admin/brackets')} className="text-zinc-400">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          {bracket.name} Entries ({entries.length})
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
           <table className="w-full text-left">
             <thead className="bg-[#18181A] border-b border-zinc-800 text-xs uppercase text-zinc-400">
               <tr>
                 <th className="px-4 py-3 font-medium">User</th>
                 <th className="px-4 py-3 font-medium">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {entries.map(entry => (
                 <tr 
                   key={entry.id} 
                   className={`hover:bg-zinc-800/20 cursor-pointer transition-colors ${selectedEntry?.id === entry.id ? 'bg-zinc-800/40' : ''}`}
                   onClick={() => setSelectedEntry(entry)}
                 >
                   <td className="px-4 py-3">
                     <div className="flex items-center gap-3">
                        <img src={entry.userAvatar} className="w-8 h-8 rounded-full" />
                        <span className="text-zinc-200 font-medium">{entry.userName}</span>
                     </div>
                   </td>
                   <td className="px-4 py-3">
                     {entry.paid ? (
                        <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">Paid</span>
                     ) : (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">Unpaid</span>
                     )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>

        <div className="lg:col-span-2">
           {selectedEntry ? (
             <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4">
                <h2 className="text-xl font-bold text-white mb-4">Picks for {selectedEntry.userName}</h2>
                <div className="pointer-events-none opacity-90 scale-95 origin-top">
                  <WorldCupBracket 
                     bracket={bracket}
                     // Pass a specific prop or use a context? Wait, WorldCupBracket inherently reads from the current user!
                     // Oh, WorldCupBracket reads from useAuth()! 
                     // I cannot easily use WorldCupBracket as a pure display component for another user.
                     // It fetches the currently logged in user's selections.
                     // I'll need to update WorldCupBracket to accept an optional 'adminSelections' and 'adminUserId'.
                  />
                </div>
             </div>
           ) : (
             <div className="bg-[#121212] border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
                Select an entry to view their picks
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
