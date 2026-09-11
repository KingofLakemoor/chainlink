import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Button } from "../../../components/ui/button";
import {
  Trophy, CheckCircle2, Activity, Link2, Search, RefreshCw, Power, Filter
} from "lucide-react";

export interface LeagueMeta {
  id: string;
  name: string;
  category: string;
  provider: string;
  dataAvailable: string;
  oddsSource: string;
  liveScores: boolean;
  liveScoreDetails: string;
  pickemStatus: string;
  defaultLink4Status: "INCLUDED" | "EXCLUDED";
}

export const LEAGUE_METADATA: Record<string, LeagueMeta> = {
  PROP: {
    id: "PROP",
    name: "Player Props",
    category: "Special",
    provider: "Internal Prop Generator (LLM + ESPN Stats)",
    dataAvailable: "Player stat targets, custom prompts, generated prop matchups",
    oddsSource: "Internal Prop Line Engine",
    liveScores: false,
    liveScoreDetails: "Manual / Evaluated from underlying game box score",
    pickemStatus: "Supported (Prop Campaigns)",
    defaultLink4Status: "EXCLUDED"
  },
  SCRIPTLESS: {
    id: "SCRIPTLESS",
    name: "ScriptLess Sports",
    category: "Special",
    provider: "ScriptLess API (scriptless.club602.com)",
    dataAvailable: "Custom matchup schedules, team logos, names, scores",
    oddsSource: "N/A (Custom match scoring)",
    liveScores: true,
    liveScoreDetails: "Real-time status & custom score sync",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  MLB: {
    id: "MLB",
    name: "Major League Baseball",
    category: "Baseball",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, live scores, inning-by-inning linescores, moneylines",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Inning status (Top/Mid/Bot & Inning Number)",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  LLWS: {
    id: "LLWS",
    name: "Little League World Series",
    category: "Baseball",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, team names, live inning scores",
    oddsSource: "N/A (Youth Sports / No Odds)",
    liveScores: true,
    liveScoreDetails: "Inning status & runs scored",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  CBASE: {
    id: "CBASE",
    name: "College Baseball",
    category: "Baseball",
    provider: "ESPN Core & Scoreboard API",
    dataAvailable: "Schedules, live scores, inning linescores",
    oddsSource: "ESPN API (when available)",
    liveScores: true,
    liveScoreDetails: "Inning status (Top/Mid/Bot)",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  NBA: {
    id: "NBA",
    name: "National Basketball Association",
    category: "Basketball",
    provider: "ESPN Core & Scoreboard API",
    dataAvailable: "Schedules, quarter scores, display clock, moneylines, spreads",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Quarter, Period Clock & Live Score",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  NBASL: {
    id: "NBASL",
    name: "NBA Summer League",
    category: "Basketball",
    provider: "ESPN Scoreboard API (Vegas, Sacramento, Salt Lake, etc.)",
    dataAvailable: "Schedules, live quarter scores, venue event data",
    oddsSource: "ESPN API (when available)",
    liveScores: true,
    liveScoreDetails: "Quarter, Period Clock & Live Score",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  WNBA: {
    id: "WNBA",
    name: "Women's NBA",
    category: "Basketball",
    provider: "ESPN Core & Scoreboard API",
    dataAvailable: "Schedules, live quarter scores, moneylines, spreads",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Quarter, Period Clock & Live Score",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  MBB: {
    id: "MBB",
    name: "Men's College Basketball",
    category: "Basketball",
    provider: "ESPN Scoreboard API (Group 50)",
    dataAvailable: "Schedules, half-by-half scores, moneylines, spreads",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Half status & Period Clock",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  WBB: {
    id: "WBB",
    name: "Women's College Basketball",
    category: "Basketball",
    provider: "ESPN Scoreboard API (Group 50)",
    dataAvailable: "Schedules, quarter/half scores, moneylines",
    oddsSource: "ESPN API (when available)",
    liveScores: true,
    liveScoreDetails: "Quarter / Half status & Clock",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  NFL: {
    id: "NFL",
    name: "National Football League",
    category: "Football",
    provider: "ESPN Core & Scoreboard API",
    dataAvailable: "Schedules, live quarter scores, moneylines, spreads, over/under",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Quarter, Period Clock & Possession",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  CFB: {
    id: "CFB",
    name: "College Football",
    category: "Football",
    provider: "ESPN Core & Scoreboard API",
    dataAvailable: "Schedules, live quarter scores, moneylines, spreads, over/under",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Quarter, Period Clock & Possession",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  NHL: {
    id: "NHL",
    name: "National Hockey League",
    category: "Hockey",
    provider: "ESPN Core & Scoreboard API",
    dataAvailable: "Schedules, period scores, display clock, moneylines",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Period & Game Clock",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  PGA: {
    id: "PGA",
    name: "PGA Tour Golf",
    category: "Golf",
    provider: "ESPN Golf Leaderboard & Scoreboard API",
    dataAvailable: "Leaderboards, golfer positions, stroke counts, hole-by-hole linescores",
    oddsSource: "N/A (Leaderboard position / Strokes)",
    liveScores: true,
    liveScoreDetails: "Round, Thru-Holes & Stroke details",
    pickemStatus: "Supported (PGA Bracket/Pickem)",
    defaultLink4Status: "EXCLUDED"
  },
  EPL: {
    id: "EPL",
    name: "English Premier League",
    category: "Soccer",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, minute clock, half scores, moneylines, over/under",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Match Minute, Halftime, Extra Time",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  MLS: {
    id: "MLS",
    name: "Major League Soccer",
    category: "Soccer",
    provider: "ESPN Scoreboard API (usa.1 & Leagues Cup)",
    dataAvailable: "Schedules, minute clock, half scores, moneylines",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Match Minute, Halftime, Stoppage Time",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  LMX: {
    id: "LMX",
    name: "Liga MX",
    category: "Soccer",
    provider: "ESPN Scoreboard API + The-Odds-API",
    dataAvailable: "Schedules, minute clock, live scores, 2-way moneylines",
    oddsSource: "The-Odds-API (DraftKings/FanDuel) + ESPN API",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  ARG: {
    id: "ARG",
    name: "Argentine Primera División",
    category: "Soccer",
    provider: "ESPN Scoreboard API + The-Odds-API",
    dataAvailable: "Schedules, Copa / Libertadores matches, live scores",
    oddsSource: "The-Odds-API (DraftKings/FanDuel via OddsProcessor)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  BRA: {
    id: "BRA",
    name: "Campeonato Brasileiro Serie A",
    category: "Soccer",
    provider: "ESPN Scoreboard API + The-Odds-API",
    dataAvailable: "Schedules, Libertadores/Sudamericana matches, live scores",
    oddsSource: "The-Odds-API (DraftKings/FanDuel via OddsProcessor)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  FRA: {
    id: "FRA",
    name: "Ligue 1 France",
    category: "Soccer",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, minute clock, live scores, moneylines",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  TUR: {
    id: "TUR",
    name: "Turkish Süper Lig",
    category: "Soccer",
    provider: "ESPN Scoreboard API + The-Odds-API",
    dataAvailable: "Schedules, live scores, 2-way moneylines",
    oddsSource: "The-Odds-API (DraftKings/FanDuel via OddsProcessor)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  RPL: {
    id: "RPL",
    name: "Russian Premier League",
    category: "Soccer",
    provider: "ESPN Scoreboard API + The-Odds-API",
    dataAvailable: "Schedules, live scores, 2-way moneylines",
    oddsSource: "The-Odds-API (DraftKings/FanDuel via OddsProcessor)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  CHN: {
    id: "CHN",
    name: "Chinese Super League",
    category: "Soccer",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, minute clock, live scores",
    oddsSource: "ESPN API (when available)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  NWSL: {
    id: "NWSL",
    name: "National Women's Soccer League",
    category: "Soccer",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, minute clock, live scores",
    oddsSource: "ESPN API (when available)",
    liveScores: true,
    liveScoreDetails: "Match Minute & Score",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  FIFA: {
    id: "FIFA",
    name: "FIFA World Cup & Int'l",
    category: "Soccer",
    provider: "ESPN Scoreboard API",
    dataAvailable: "Schedules, group stage tables, live scores, moneylines",
    oddsSource: "ESPN API (DraftKings / ESPN BET)",
    liveScores: true,
    liveScoreDetails: "Match Minute, ET, Penalty Shootout",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  },
  ATP: {
    id: "ATP",
    name: "ATP Men's Tennis",
    category: "Tennis",
    provider: "ESPN Tennis Scoreboard API + The-Odds-API",
    dataAvailable: "Tournaments, singles matchups, set/game linescores",
    oddsSource: "The-Odds-API (DraftKings/FanDuel via OddsProcessor)",
    liveScores: true,
    liveScoreDetails: "Set & Game breakdown",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  WTA: {
    id: "WTA",
    name: "WTA Women's Tennis",
    category: "Tennis",
    provider: "ESPN Tennis Scoreboard API + The-Odds-API",
    dataAvailable: "Tournaments, singles matchups, set/game linescores",
    oddsSource: "The-Odds-API (DraftKings/FanDuel via OddsProcessor)",
    liveScores: true,
    liveScoreDetails: "Set & Game breakdown",
    pickemStatus: "Supported",
    defaultLink4Status: "EXCLUDED"
  },
  CRICKET: {
    id: "CRICKET",
    name: "Cricket (MLC & International)",
    category: "Cricket",
    provider: "ESPN Cricket API",
    dataAvailable: "Schedules, overs/innings linescores, custom team logos",
    oddsSource: "ESPN API (when available)",
    liveScores: true,
    liveScoreDetails: "Overs & Innings breakdown",
    pickemStatus: "Supported",
    defaultLink4Status: "INCLUDED"
  }
};

export const CATEGORIES = [
  "ALL",
  "Football",
  "Basketball",
  "Soccer",
  "Baseball",
  "Tennis",
  "Special",
  "Hockey",
  "Golf",
  "Cricket"
] as const;

export function AdminLeagues() {
  const ALL_LEAGUES = [
    "PROP", "SCRIPTLESS", "MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA",
    "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL",
    "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"
  ];

  const getDefaultLeagues = () => ALL_LEAGUES.map(league => ({
    id: league,
    active: true,
    meta: LEAGUE_METADATA[league] || {
      id: league,
      name: league,
      category: "Other",
      provider: "ESPN API",
      dataAvailable: "Schedules & Scores",
      oddsSource: "ESPN API",
      liveScores: true,
      liveScoreDetails: "Score & Clock",
      pickemStatus: "Supported",
      defaultLink4Status: "INCLUDED"
    }
  }));

  const [leagues, setLeagues] = useState<{ id: string, active: boolean, meta: LeagueMeta }[]>(getDefaultLeagues);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const snap = await Promise.race([
        getDocs(collection(db, 'leagueSettings')),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
      ]);
      const settingsMap = new Map();
      snap.docs.forEach(d => settingsMap.set(d.id, d.data()));

      const formatted = ALL_LEAGUES.map(league => {
        const meta = LEAGUE_METADATA[league] || {
          id: league,
          name: league,
          category: "Other",
          provider: "ESPN API",
          dataAvailable: "Schedules & Scores",
          oddsSource: "ESPN API",
          liveScores: true,
          liveScoreDetails: "Score & Clock",
          pickemStatus: "Supported",
          defaultLink4Status: "INCLUDED"
        };
        return {
          id: league,
          active: settingsMap.has(league) ? settingsMap.get(league).active : true,
          meta
        };
      });

      setLeagues(formatted);
    } catch (e) {
      console.warn("Using default settings map", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  const handleToggle = async (leagueId: string, currentActive: boolean) => {
    try {
      await setDoc(doc(db, 'leagueSettings', leagueId), {
        active: !currentActive,
        updatedAt: Date.now()
      }, { merge: true });

      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, active: !currentActive } : l));
    } catch (e) {
      console.error(e);
      alert("Failed to update league settings.");
    }
  };

  const handleDeactivateScheduled = async (leagueId: string) => {
    if (!confirm(`Are you sure you want to deactivate all SCHEDULED games for ${leagueId}?`)) return;

    try {
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/leagues/deactivate-scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leagueId })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully deactivated ${data.deactivatedCount} scheduled games for ${leagueId}.`);
      } else {
        alert("Failed to deactivate games: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      console.error(e);
      alert(`Failed to deactivate games for ${leagueId}: ` + e.message);
    }
  };

  const filteredLeagues = leagues.filter(l => {
    const matchesSearch =
      l.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.meta.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.meta.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.meta.provider.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesCategory = selectedCategory === "ALL" || l.meta.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // KPI Metrics
  const totalSports = leagues.length;
  const activeCount = leagues.filter(l => l.active).length;
  const liveScoresCount = leagues.filter(l => l.meta.liveScores).length;
  const link4IncludedCount = leagues.filter(l => l.meta.defaultLink4Status === "INCLUDED").length;

  if (loading) return <div className="p-8 text-zinc-500">Loading league metadata...</div>;

  return (
    <div className="space-y-6">
      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Sports / Leagues</p>
            <h3 className="text-2xl font-bold text-zinc-100 mt-1 font-mono">{totalSports}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Active Leagues</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{activeCount} / {totalSports}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Live Score Capabilities</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">{liveScoresCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Link4 Default Included</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1 font-mono">{link4IncludedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Link2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header and Filter Controls */}
        <div className="p-4 border-b border-zinc-800 space-y-3 bg-[#18181A]">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                Leagues & Provider Mapping
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Physical mapping of data providers, odds sources, live score capabilities, and campaign statuses per sport.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search sports..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#121212] border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-full"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={fetchLeagues} className="gap-1.5 text-xs shrink-0">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-400" /> Category:
            </span>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* League Table */}
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-normal">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 text-xs uppercase tracking-wider z-10">
              <tr>
                <th className="px-4 py-3 font-medium min-w-[140px]">Sport / League</th>
                <th className="px-4 py-3 font-medium min-w-[220px]">Data Provider & Available Data</th>
                <th className="px-4 py-3 font-medium min-w-[180px]">Odds Source</th>
                <th className="px-4 py-3 font-medium min-w-[150px]">Live Scores</th>
                <th className="px-4 py-3 font-medium min-w-[200px]">Statuses (Pick 'Em & Link4)</th>
                <th className="px-4 py-3 font-medium min-w-[130px] text-right">League Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredLeagues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 font-medium">
                    No sports or leagues found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeagues.map(l => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-emerald-400 font-mono font-bold">
                          {l.id}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{l.meta.name}</div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-wide">{l.meta.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-zinc-200">{l.meta.provider}</div>
                      <div className="text-zinc-400 text-[11px] mt-0.5">{l.meta.dataAvailable}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="inline-block px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px]">
                        {l.meta.oddsSource}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        {l.meta.liveScores ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Available
                          </span>
                        ) : (
                          <span className="text-zinc-500">Manual / None</span>
                        )}
                      </div>
                      <div className="text-zinc-400 text-[11px] mt-0.5">{l.meta.liveScoreDetails}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Pick 'Em:</span>
                          <span className="font-semibold text-emerald-400">{l.meta.pickemStatus}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Link4 Default:</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                            l.meta.defaultLink4Status === 'INCLUDED'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {l.meta.defaultLink4Status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => handleToggle(l.id, l.active)}
                          className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-colors w-full ${
                            l.active
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                        >
                          {l.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                        <Button variant="outline" size="sm" className="text-[10px] px-2 py-0.5 h-auto text-zinc-400 hover:text-white" onClick={() => handleDeactivateScheduled(l.id)}>
                          Deactivate Games
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
    </div>
  );
}
