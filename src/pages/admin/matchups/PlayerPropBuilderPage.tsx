import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const LEAGUES: Record<string, { sport: string, path: string }> = {
  'NFL': { sport: 'football', path: 'nfl' },
  'CFB': { sport: 'football', path: 'college-football' },
  'NBA': { sport: 'basketball', path: 'nba' },
  'MLB': { sport: 'baseball', path: 'mlb' },
};

const STAT_TYPES: Record<string, string[]> = {
  'NFL': ['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'TOUCHDOWNS', 'ANYTIME_TD', 'INTERCEPTIONS'],
  'CFB': ['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'TOUCHDOWNS', 'ANYTIME_TD', 'INTERCEPTIONS'],
  'NBA': ['POINTS', 'REBOUNDS', 'ASSISTS', 'THREES'],
  'MLB': ['STRIKEOUTS', 'HITS', 'HOME_RUNS'],
};

function PlayerSelector({ label, onSelect }: { label: string, onSelect: (data: any) => void }) {
  const [league, setLeague] = useState<string>('NFL');
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    fetchGames();
  }, [league]);

  const fetchGames = async () => {
    setLoadingGames(true);
    setGames([]);
    setSelectedGameId('');
    setTeams([]);
    setSelectedTeamId('');
    setPlayers([]);
    setSelectedPlayerId('');
    try {
      const config = LEAGUES[league];
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.path}/scoreboard?dates=${dateStr}`);
      const data = await res.json();
      
      const g = (data.events || []).map((e: any) => {
        const comp = e.competitions[0];
        return {
          id: e.id,
          name: e.name,
          startTime: new Date(comp.date).getTime(),
          teams: comp.competitors.map((c: any) => ({
            id: c.team.id,
            name: c.team.displayName,
            abbreviation: c.team.abbreviation,
            logo: c.team.logo
          }))
        };
      });
      setGames(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    if (selectedGameId) {
      const game = games.find(g => g.id === selectedGameId);
      if (game) setTeams(game.teams);
      else setTeams([]);
      setSelectedTeamId('');
      setPlayers([]);
      setSelectedPlayerId('');
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (selectedTeamId && selectedGameId) {
      fetchPlayers();
    }
  }, [selectedTeamId]);

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    setPlayers([]);
    try {
      const config = LEAGUES[league];
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.path}/teams/${selectedTeamId}/roster`);
      const data = await res.json();
      let roster = [];
      if (data.athletes && data.athletes[0] && data.athletes[0].items) {
        roster = data.athletes[0].items;
      } else if (data.athletes) {
        roster = data.athletes;
      }
      setPlayers(roster);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    if (selectedPlayerId) {
      const game = games.find(g => g.id === selectedGameId);
      const team = teams.find(t => String(t.id) === String(selectedTeamId));
      const player = players.find(p => String(p.id) === String(selectedPlayerId));
      
      if (game && team && player) {
        onSelect({
          league,
          gameId: game.id,
          startTime: game.startTime,
          teamId: team.id,
          teamName: team.name,
          playerId: player.id,
          playerName: player.fullName || player.displayName,
          playerImage: player.headshot?.href
        });
      }
    } else {
      onSelect(null);
    }
  }, [selectedPlayerId]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="font-bold text-white mb-2">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">League</label>
          <select value={league} onChange={e => setLeague(e.target.value)} className="w-full bg-[#121212] border border-zinc-800 rounded-lg p-2 text-white text-sm">
            {Object.keys(LEAGUES).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Game</label>
          <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)} disabled={loadingGames} className="w-full bg-[#121212] border border-zinc-800 rounded-lg p-2 text-white text-sm">
            <option value="">Select a game...</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>
      {selectedGameId && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Team</label>
          <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className="w-full bg-[#121212] border border-zinc-800 rounded-lg p-2 text-white text-sm">
            <option value="">Select a team...</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
      {selectedTeamId && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Player</label>
          <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} disabled={loadingPlayers} className="w-full bg-[#121212] border border-zinc-800 rounded-lg p-2 text-white text-sm">
            <option value="">Select a player...</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.fullName || p.displayName}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function PlayerPropBuilderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [builderMode, setBuilderMode] = useState<'H2H' | 'SOLO'>('SOLO');
  const [optionA, setOptionA] = useState<any>(null);
  const [optionB, setOptionB] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    statTypeA: '',
    statTypeB: '',
    timeframe: 'FULL_GAME',
    propType: 'OVER_UNDER',
    targetLine: '0.5'
  });

  useEffect(() => {
    if (builderMode === 'H2H') {
        if (optionA && optionB && formData.statTypeA && formData.statTypeB) {
          let t = `${optionA.playerName} (${formData.statTypeA}) vs ${optionB.playerName}`;
          if (formData.statTypeA !== formData.statTypeB) {
              t += ` (${formData.statTypeB})`;
          }
          if (formData.timeframe !== 'FULL_GAME') {
              t += ` [${formData.timeframe.replace('_', ' ')}]`;
          }
          setFormData(prev => ({ ...prev, title: t }));
        }
    } else {
        if (optionA && formData.statTypeA) {
            let t = `${optionA.playerName} - ${formData.statTypeA}`;
            if (formData.propType === 'OVER_UNDER') {
                t += ` (${formData.targetLine})`;
            }
            if (formData.timeframe !== 'FULL_GAME') {
                t += ` [${formData.timeframe.replace('_', ' ')}]`;
            }
            setFormData(prev => ({ ...prev, title: t }));
        }
    }
  }, [optionA, optionB, formData.statTypeA, formData.statTypeB, formData.timeframe, builderMode, formData.propType, formData.targetLine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (builderMode === 'H2H') {
        if (!optionA || !optionB) {
          alert("Please select both Player A and Player B.");
          return;
        }
        if (!formData.statTypeA || !formData.statTypeB) {
          alert("Please select stat types for both players.");
          return;
        }
    } else {
        if (!optionA) {
          alert("Please select a Player.");
          return;
        }
        if (!formData.statTypeA) {
          alert("Please select a stat type.");
          return;
        }
    }

    setLoading(true);
    try {
      if (builderMode === 'H2H') {
          const startTime = Math.min(optionA.startTime, optionB.startTime);
          const isCrossSport = optionA.league !== optionB.league;
          const matchupData = {
            title: formData.title,
            league: isCrossSport ? 'CROSS_SPORT' : optionA.league,
            type: 'STATS',
            typeDetails: 'PLAYER_STAT',
            cost: 0,
            startTime,
            active: true,
            featured: false,
            featuredType: '',
            status: 'STATUS_SCHEDULED',
            gameId: `prop_builder_${Date.now()}_${optionA.playerId}_${optionB.playerId}`,
            hasCustomTitle: true,
            homeTeam: {
              id: `prop_${optionB.playerId}`,
              name: optionB.playerName,
              image: optionB.playerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(optionB.playerName)}&background=random`,
              score: 0
            },
            awayTeam: {
              id: `prop_${optionA.playerId}`,
              name: optionA.playerName,
              image: optionA.playerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(optionA.playerName)}&background=random`,
              score: 0
            },
            metadata: {
              isPropMatchup: true,
              timeframe: formData.timeframe,
              optionA: {
                league: optionA.league,
                gameId: optionA.gameId,
                playerId: optionA.playerId,
                teamId: optionA.teamId,
                statType: formData.statTypeA
              },
              optionB: {
                league: optionB.league,
                gameId: optionB.gameId,
                playerId: optionB.playerId,
                teamId: optionB.teamId,
                statType: formData.statTypeB
              }
            }
          };
          await setDoc(doc(db, 'matchups', matchupData.gameId), matchupData);
      } else {
          const matchupData = {
            title: formData.title,
            league: optionA.league,
            type: 'STATS',
            typeDetails: 'PLAYER_STAT',
            cost: 0,
            startTime: optionA.startTime,
            active: true,
            featured: false,
            featuredType: '',
            status: 'STATUS_SCHEDULED',
            gameId: `solo_prop_${Date.now()}_${optionA.playerId}`,
            hasCustomTitle: true,
            homeTeam: {
              id: formData.propType === 'OVER_UNDER' ? 'under' : 'no',
              name: formData.propType === 'OVER_UNDER' ? `Under ${formData.targetLine}` : 'No',
              image: `https://ui-avatars.com/api/?name=${formData.propType === 'OVER_UNDER' ? 'U' : 'N'}&background=random`,
              score: parseFloat(formData.targetLine) || 0.5
            },
            awayTeam: {
              id: formData.propType === 'OVER_UNDER' ? 'over' : 'yes',
              name: formData.propType === 'OVER_UNDER' ? `Over ${formData.targetLine}` : 'Yes',
              image: optionA.playerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(optionA.playerName)}&background=random`,
              score: 0
            },
            metadata: {
              isPropMatchup: true,
              isSoloProp: true,
              propType: formData.propType,
              targetLine: parseFloat(formData.targetLine) || 0.5,
              timeframe: formData.timeframe,
              optionA: {
                league: optionA.league,
                gameId: optionA.gameId,
                playerId: optionA.playerId,
                teamId: optionA.teamId,
                statType: formData.statTypeA,
                playerName: optionA.playerName
              }
            }
          };
          await setDoc(doc(db, 'matchups', matchupData.gameId), matchupData);
      }

      alert("Prop Matchup created successfully!");
      navigate('/admin/matchups');
    } catch (e) {
      console.error("Error creating prop matchup:", e);
      alert("Error creating prop matchup. Check console.");
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
          <UserPlus className="text-blue-500" />
          Player Prop Builder
        </h1>
        <div className="flex-1" />
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex">
            <button 
                onClick={() => setBuilderMode('SOLO')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${builderMode === 'SOLO' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
                Solo Prop
            </button>
            <button 
                onClick={() => setBuilderMode('H2H')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${builderMode === 'H2H' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
                Head to Head
            </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${builderMode === 'H2H' ? 'md:grid-cols-2' : ''} gap-6 mb-8`}>
        <PlayerSelector label={builderMode === 'H2H' ? "Option A (Away Team Slot)" : "Select Player"} onSelect={setOptionA} />
        {builderMode === 'H2H' && <PlayerSelector label="Option B (Home Team Slot)" onSelect={setOptionB} />}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <h3 className="font-bold text-lg text-white mb-4">Prop Configuration</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">{builderMode === 'H2H' ? 'Option A Stat Type' : 'Stat Type'}</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              value={formData.statTypeA}
              onChange={e => setFormData({ ...formData, statTypeA: e.target.value })}
              disabled={!optionA}
            >
              <option value="">Select stat type...</option>
              {optionA && STAT_TYPES[optionA.league]?.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          {builderMode === 'H2H' ? (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Option B Stat Type</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                  value={formData.statTypeB}
                  onChange={e => setFormData({ ...formData, statTypeB: e.target.value })}
                  disabled={!optionB}
                >
                  <option value="">Select stat type...</option>
                  {optionB && STAT_TYPES[optionB.league]?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Prop Type</label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                      value={formData.propType}
                      onChange={e => setFormData({ ...formData, propType: e.target.value })}
                    >
                      <option value="OVER_UNDER">Over/Under</option>
                      <option value="YES_ONLY">Yes Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Target Line</label>
                    <input
                      type="number"
                      step="0.5"
                      disabled={formData.propType === 'YES_ONLY'}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      value={formData.propType === 'YES_ONLY' ? '0.5' : formData.targetLine}
                      onChange={e => setFormData({ ...formData, targetLine: e.target.value })}
                    />
                  </div>
              </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Timeframe</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              value={formData.timeframe}
              onChange={e => setFormData({ ...formData, timeframe: e.target.value })}
            >
              <option value="FULL_GAME">Full Game</option>
              <option value="FIRST_HALF">1st Half</option>
              <option value="FIRST_QUARTER">1st Quarter</option>
            </select>
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Matchup Title</label>
            <input
              type="text"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              placeholder={builderMode === 'H2H' ? "e.g., Bam Adebayo (POINTS) vs Tua Tagovailoa (PASSING_YARDS)" : "Patrick Mahomes - Passing TDs (2.5)"}
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">
          {loading ? 'Creating...' : 'Create Prop Matchup'}
        </Button>
      </form>
    </div>
  );
}
