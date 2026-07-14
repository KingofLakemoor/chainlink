import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flag, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';


export default function PGABuilderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [golfers, setGolfers] = useState<any[]>([]);


  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga');
      const data = await res.json();
      const events = data.events || [];
      if (events.length > 0 && events[0].competitions && events[0].competitions.length > 0) {
        const comp = events[0].competitions[0];
        const competitors = comp.competitors?.filter((c: any) => c.athlete || c.team) || [];

        const parsedGolfers = competitors.map((c: any) => {
          const golfer = c.athlete || c.team;
          return {
            id: String(c.id),
            name: golfer.displayName || golfer.name || 'Unknown',
            score: c.score?.displayValue ?? (typeof c.score === 'string' || typeof c.score === 'number' ? c.score : c.displayValue) ?? 'E',
            image: golfer.flag?.href || '/icons/icon-256x256.png',
            raw: c
          };
        }).sort((a: any, b: any) => a.name.localeCompare(b.name));

        setGolfers(parsedGolfers);
      }
    } catch (e) {
      console.error("Error fetching PGA leaderboard:", e);
      alert("Failed to fetch PGA leaderboard. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    matchupType: 'TOURNAMENT_FINISH',
    period: 1,
    holes: 3,
    startTime: '',
    homeTeamId: '',
    awayTeamId: '',
  });

  useEffect(() => {
    if (formData.awayTeamId && formData.homeTeamId) {
      const awayGolfer = golfers.find(g => g.id === formData.awayTeamId);
      const homeGolfer = golfers.find(g => g.id === formData.homeTeamId);

      if (awayGolfer && homeGolfer) {
        let newTitle = `${awayGolfer.name} vs ${homeGolfer.name}`;
        if (formData.matchupType === 'TOURNAMENT_FINISH') {
          newTitle += ` (Tournament Finish)`;
        } else if (formData.matchupType === 'ROUND_SCORE') {
          newTitle += ` (R${formData.period} Score)`;
        } else if (formData.matchupType === 'THRU_HOLES') {
          newTitle += ` (R${formData.period} Thru ${formData.holes} Holes)`;
        } else if (formData.matchupType === 'BIRDIES_THRU_HOLES') {
          newTitle += ` (Most Birdies or Better R${formData.period} Thru ${formData.holes} Holes)`;
        } else if (formData.matchupType === 'EAGLES_THRU_HOLES') {
          newTitle += ` (Most Eagles or Better R${formData.period} Thru ${formData.holes} Holes)`;
        } else if (formData.matchupType === 'PARS_THRU_HOLES') {
          newTitle += ` (Most Pars R${formData.period} Thru ${formData.holes} Holes)`;
        } else if (formData.matchupType === 'BOGEYS_THRU_HOLES') {
          newTitle += ` (Fewer Bogeys or Worse R${formData.period} Thru ${formData.holes} Holes)`;
        }

        setFormData(prev => ({ ...prev, title: newTitle }));
      }
    }
  }, [formData.awayTeamId, formData.homeTeamId, formData.matchupType, formData.period, formData.holes, golfers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.homeTeamId || !formData.awayTeamId) {
      alert("Please fill out all required fields.");
      return;
    }

    const homeGolfer = golfers.find(g => g.id === formData.homeTeamId);
    const awayGolfer = golfers.find(g => g.id === formData.awayTeamId);

    if (!homeGolfer || !awayGolfer) {
      alert("Golfers not found in loaded data.");
      return;
    }

    setLoading(true);
    try {
      let finalStartTime = new Date().getTime();
      if (formData.startTime) {
        finalStartTime = new Date(formData.startTime).getTime();
      } else {
        // Attempt to find tee time from raw data
        const getTeeTime = (c: any) => {
            const ls = c.linescores?.find((ls: any) => ls.period === (formData.matchupType === 'ROUND_SCORE' ? formData.period : 1));
            if (ls?.teeTime) return new Date(ls.teeTime).getTime();
            return null;
        };
        const teeHome = getTeeTime(homeGolfer.raw);
        const teeAway = getTeeTime(awayGolfer.raw);
        if (teeHome && teeAway) finalStartTime = Math.min(teeHome, teeAway);
        else if (teeHome) finalStartTime = teeHome;
        else if (teeAway) finalStartTime = teeAway;
      }

      const isThruHolesMatchup = ['THRU_HOLES', 'BIRDIES_THRU_HOLES', 'EAGLES_THRU_HOLES', 'PARS_THRU_HOLES', 'BOGEYS_THRU_HOLES'].includes(formData.matchupType);

      let lowerScoreWins = true;
      if (['BIRDIES_THRU_HOLES', 'EAGLES_THRU_HOLES', 'PARS_THRU_HOLES'].includes(formData.matchupType)) {
          lowerScoreWins = false;
      }

      const matchupData = {
        title: formData.title,
        league: 'PGA',
        type: 'SCORE',
        typeDetails: 'GOLF',
        cost: 0,
        startTime: finalStartTime,
        active: true,
        featured: false,
        featuredType: '',
        status: 'STATUS_SCHEDULED',
        gameId: `pga_builder_${Date.now()}_${awayGolfer.id}_${homeGolfer.id}`,
        hasCustomTitle: true,
        homeTeam: {
          id: homeGolfer.id,
          name: homeGolfer.name,
          image: homeGolfer.image,
          score: 0
        },
        awayTeam: {
          id: awayGolfer.id,
          name: awayGolfer.name,
          image: awayGolfer.image,
          score: 0
        },
        metadata: {
          golf: true,
          lowerScoreWins,
          period: (formData.matchupType === 'ROUND_SCORE' || isThruHolesMatchup) ? formData.period : 0,
          holes: isThruHolesMatchup ? formData.holes : 0,
          pgaBuilder: true,
          matchupType: formData.matchupType
        }
      };

      await setDoc(doc(db, 'matchups', matchupData.gameId), matchupData);

      alert("Matchup created successfully!");
      navigate('/admin/matchups');
    } catch (e) {
      console.error("Error creating matchup:", e);
      alert("Error creating matchup. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Flag className="text-green-500" />
          PGA Matchup Builder
        </h1>
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={fetchLeaderboard} disabled={loading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4" />
          {loading ? 'Fetching...' : 'Fetch Current Leaderboard'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Matchup Title</label>
            <input
              type="text"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
              placeholder="e.g., Scottie Scheffler vs Rory McIlroy (R1 Score)"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Matchup Type</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
              value={formData.matchupType}
              onChange={e => setFormData({ ...formData, matchupType: e.target.value })}
            >
              <option value="TOURNAMENT_FINISH">Tournament Finish (Full Event)</option>
              <option value="ROUND_SCORE">Round Score</option>
              <option value="THRU_HOLES">Thru Holes</option>
              <option value="BIRDIES_THRU_HOLES">Birdies or Better Thru Holes</option>
              <option value="EAGLES_THRU_HOLES">Eagles or Better Thru Holes</option>
              <option value="PARS_THRU_HOLES">Pars Thru Holes</option>
              <option value="BOGEYS_THRU_HOLES">Fewer Bogeys or Worse Thru Holes</option>
            </select>
          </div>

          {(formData.matchupType !== 'TOURNAMENT_FINISH') && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Round Number</label>
              <input
                type="number"
                min="1"
                max="4"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
                value={formData.period}
                onChange={e => setFormData({ ...formData, period: parseInt(e.target.value) || 1 })}
              />
            </div>
          )}

          {['THRU_HOLES', 'BIRDIES_THRU_HOLES', 'EAGLES_THRU_HOLES', 'PARS_THRU_HOLES', 'BOGEYS_THRU_HOLES'].includes(formData.matchupType) && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Through Holes</label>
              <input
                type="number"
                min="1"
                max="18"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
                value={formData.holes}
                onChange={e => setFormData({ ...formData, holes: parseInt(e.target.value) || 1 })}
              />
            </div>
          )}

          {formData.matchupType === 'TOURNAMENT_FINISH' && (
             <div></div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Golfer A (Away)</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
              value={formData.awayTeamId}
              onChange={e => setFormData({ ...formData, awayTeamId: e.target.value })}
            >
              <option value="">Select Golfer...</option>
              {golfers.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({isNaN(g.score) ? 0 : g.score})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Golfer B (Home)</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
              value={formData.homeTeamId}
              onChange={e => setFormData({ ...formData, homeTeamId: e.target.value })}
            >
              <option value="">Select Golfer...</option>
              {golfers.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({isNaN(g.score) ? 0 : g.score})</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Start Time (Optional Override)</label>
            <input
              type="datetime-local"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
              value={formData.startTime}
              onChange={e => setFormData({ ...formData, startTime: e.target.value })}
            />
            <p className="text-xs text-zinc-500 mt-1">If left blank, will attempt to use the earliest tee time between the two golfers.</p>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg">
          {loading ? 'Creating...' : 'Create PGA Matchup'}
        </Button>
      </form>
    </div>
  );
}
