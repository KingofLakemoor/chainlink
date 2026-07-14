import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

export default function EditPickPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pick, setPick] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPick = async () => {
      setLoading(true);
      try {
        if (!id) return;
        const docRef = doc(db, 'picks', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPick({ ...docSnap.data(), id: docSnap.id });
        }
      } catch (error) {
        console.error("Error fetching pick:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPick();
  }, [id]);

  const handleSave = async () => {
    if (!id || !pick) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'picks', id);
      const { id: _, ...updateData } = pick;

      // Parse JSON string values back to objects if needed
      const finalData = { ...updateData };
      if (typeof finalData.pick === 'string') {
        try {
          finalData.pick = JSON.parse(finalData.pick);
        } catch (e) {
          throw new Error('Invalid JSON format in pick field');
        }
      }

      await updateDoc(docRef, finalData);
      navigate('/admin/picks');
    } catch (error) {
      console.error("Error updating pick:", error);
      alert("Failed to save pick. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setPick((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading pick...</div>;
  if (!pick) return <div className="p-8 text-red-500">Pick not found.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Edit Pick</h1>
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 space-y-4">
        {Object.entries(pick).map(([key, value]) => {
          if (key === 'id') return null; // Don't edit ID

          let inputValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

          return (
            <div key={key}>
              <label className="block text-sm font-medium text-zinc-400 mb-1 capitalize">{key}</label>
              {typeof value === 'boolean' ? (
                <select
                  value={String(value)}
                  onChange={(e) => handleChange(key, e.target.value === 'true')}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  type={typeof value === 'number' ? 'number' : 'text'}
                  value={inputValue}
                  onChange={(e) => {
                    let val: any = e.target.value;
                    if (typeof value === 'number') val = Number(val);
                    handleChange(key, val);
                  }}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t border-zinc-800">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Pick'}
          </Button>
        </div>
      </div>
    </div>
  );
}
