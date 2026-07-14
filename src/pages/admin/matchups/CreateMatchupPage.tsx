import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function CreateMatchupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    league: 'NFL',
    type: 'MONEYLINE',
    typeDetails: 'GREATER_THAN',
    cost: 0,
    startTime: '',
    active: true,
    featured: false,
    featuredType: '',
    status: 'STATUS_SCHEDULED',
    gameId: '',
    homeTeamName: '',
    homeTeamId: '',
    homeTeamImage: '',
    awayTeamName: '',
    awayTeamId: '',
    awayTeamImage: '',
    metadataSpread: '',
    metadataOverUnder: '',
  });
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const sponsorsSnap = await getDocs(query(collection(db, 'sponsors'), where('active', '==', true)));
        if (!sponsorsSnap.empty) {
            setSponsors(sponsorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error("Error fetching sponsors", error);
      }
    };
    fetchSponsors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime || !formData.homeTeamName || !formData.awayTeamName) return;

    setLoading(true);
    try {
      const matchupData = {
        title: formData.title,
        league: formData.league,
        type: formData.type,
        typeDetails: formData.typeDetails,
        cost: Number(formData.cost),
        startTime: new Date(formData.startTime).getTime(),
        active: formData.active,
        featured: formData.featured,
        featuredType: formData.featured ? formData.featuredType : '',
        status: formData.status,
        gameId: formData.gameId || `custom-${Date.now()}`,
        hasCustomTitle: true,
        homeTeam: {
          id: formData.homeTeamId || 'home',
          name: formData.homeTeamName,
          image: formData.homeTeamImage,
          score: 0
        },
        awayTeam: {
          id: formData.awayTeamId || 'away',
          name: formData.awayTeamName,
          image: formData.awayTeamImage,
          score: 0
        },
        metadata: {
          ...(formData.type === 'SPREAD' && formData.metadataSpread !== '' && { spread: Number(formData.metadataSpread) }),
          ...(formData.type === 'OVER_UNDER' && formData.metadataOverUnder !== '' && { overUnder: Number(formData.metadataOverUnder) }),
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, 'matchups', matchupData.gameId), matchupData);
      navigate('/admin/matchups');
    } catch (error) {
      console.error('Error creating matchup:', error);
      alert('Failed to create matchup');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="text-indigo-500" />
          Create Matchup
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">League</label>
            <input
              type="text"
              name="league"
              value={formData.league}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Game ID (Optional)</label>
            <input
              type="text"
              name="gameId"
              value={formData.gameId}
              onChange={handleChange}
              placeholder="e.g. espn-12345"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="MONEYLINE">Moneyline</option>
              <option value="SPREAD">Spread</option>
              <option value="OVER_UNDER">Over/Under</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {formData.type === 'SPREAD' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Spread</label>
              <input
                type="number"
                step="0.5"
                name="metadataSpread"
                value={formData.metadataSpread}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {formData.type === 'OVER_UNDER' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Total (Over/Under)</label>
              <input
                type="number"
                step="0.5"
                name="metadataOverUnder"
                value={formData.metadataOverUnder}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Cost (Wager)</label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              min="0"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Start Time</label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-800">
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Home Team</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
              <input type="text" name="homeTeamName" value={formData.homeTeamName} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">ID (Optional)</label>
              <input type="text" name="homeTeamId" value={formData.homeTeamId} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Image URL (Optional)</label>
              <input type="url" name="homeTeamImage" value={formData.homeTeamImage} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">Away Team</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
              <input type="text" name="awayTeamName" value={formData.awayTeamName} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">ID (Optional)</label>
              <input type="text" name="awayTeamId" value={formData.awayTeamId} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Image URL (Optional)</label>
              <input type="url" name="awayTeamImage" value={formData.awayTeamImage} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="active" id="active-cb" checked={formData.active} onChange={handleChange} className="rounded bg-zinc-950 border-zinc-800 text-indigo-500 focus:ring-indigo-500" />
              <label htmlFor="active-cb" className="text-sm font-medium text-white">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="featured" id="featured-cb" checked={formData.featured} onChange={handleChange} className="rounded bg-zinc-950 border-zinc-800 text-indigo-500 focus:ring-indigo-500" />
              <label htmlFor="featured-cb" className="text-sm font-medium text-white">Featured</label>
            </div>
            {formData.featured && (
                <div className="flex items-center gap-2">
                  <select name="featuredType" value={formData.featuredType} onChange={handleChange} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500">
                      <option value="">Featured</option>
                      <option value="ChainBuilder">ChainBuilder</option>
                      {sponsors.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? 'Creating...' : 'Create Matchup'}
          </Button>
        </div>
      </form>
    </div>
  );
}
