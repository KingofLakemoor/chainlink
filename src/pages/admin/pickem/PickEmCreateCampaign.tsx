import React from 'react';
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function PickEmCreateCampaign() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [leagues, setLeagues] = useState<string[]>(['CFB']);
  const [defaultMatchType, setDefaultMatchType] = useState('STANDARD');
  const [format, setFormat] = useState('STANDARD');
  const [pickLimit, setPickLimit] = useState<number>(0);
  const [totalWeeks, setTotalWeeks] = useState<number>(18);
  const [hasWeekZero, setHasWeekZero] = useState<boolean>(false);
  const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);
  const [entryFee, setEntryFee] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [themePrimaryColor, setThemePrimaryColor] = useState('#22c55e');
  const [themeTitle, setThemeTitle] = useState('');
  const [themeSubtitle, setThemeSubtitle] = useState('');
  const [themeLogoFile, setThemeLogoFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [themeLogoUrl, setThemeLogoUrl] = useState('');

  const [visibleDateStr, setVisibleDateStr] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [gamesBeginDateStr, setGamesBeginDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [endDateStr, setEndDateStr] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });


  const availableLeagues = ['CFB', 'CBASE', 'NFL', 'NBA', 'NBASL', 'MLB', 'LLWS', 'LMX'];

  const handleLeagueToggle = (league: string) => {
    setLeagues(prev =>
      prev.includes(league)
        ? prev.filter(l => l !== league)
        : [...prev, league]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || leagues.length === 0) {
      alert("Please enter a name and select at least one league.");
      return;
    }

    setLoading(true);
    try {
      let finalLogoUrl = themeLogoUrl;
      if (themeLogoFile) {
        const storage = getStorage(app);
        const storageRef = ref(storage, `pickem_logos/${Date.now()}_${themeLogoFile.name}`);
        await uploadBytes(storageRef, themeLogoFile);
        finalLogoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'pickemCampaigns'), {
        name: name.trim(),
        league: leagues[0], // Keep for backward compatibility if needed in old queries
        leagues: leagues,
        pickLimit: pickLimit,
        totalWeeks: totalWeeks,
        hasWeekZero: hasWeekZero,
        type: 'STANDARD',
        defaultMatchType,
        scoringType: 'WIN_LOSS',
        visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() || Date.now() : Date.now(),
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() || Date.now() : Date.now(),
        startDate: visibleDateStr ? new Date(visibleDateStr).getTime() || Date.now() : Date.now(),
        endDate: endDateStr ? new Date(endDateStr).getTime() || Date.now() + 1000 * 60 * 60 * 24 * 30 * 6 : Date.now() + 1000 * 60 * 60 * 24 * 30 * 6,
        theme: {
          primaryColor: themePrimaryColor,
          title: themeTitle,
          subtitle: themeSubtitle,
          logoUrl: finalLogoUrl,
        },
        currentWeek: hasWeekZero ? 0 : 1,
        isPrivate,
        joinCode: isPrivate ? joinCode : '',
        entryFee: entryFee,
        createdAt: Date.now()
      });
      navigate('/admin/pickem');
    } catch (err) {
      console.error(err);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Create Pick'em Campaign</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Cancel</Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 2024 College Football Season"
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Leagues</label>
            <div className="flex flex-wrap gap-4">
              {availableLeagues.map(l => (
                <label key={l} className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={leagues.includes(l)}
                    onChange={() => handleLeagueToggle(l)}
                    className="w-4 h-4 rounded border-zinc-800 bg-[#18181A] text-[#22c55e] focus:ring-[#22c55e]"
                  />
                  {l.replace('-', ' ')}
                </label>
              ))}
            </div>
            {leagues.length === 0 && <p className="text-red-500 text-sm mt-1">Please select at least one league.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Weekly Pick Limit (0 for unlimited)</label>
            <input
              type="number"
              min="0"
              value={pickLimit}
              onChange={e => setPickLimit(parseInt(e.target.value) || 0)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Default Match Type</label>
            <select
              value={defaultMatchType}
              onChange={e => setDefaultMatchType(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="STANDARD">Standard (Moneyline)</option>
              <option value="SPREAD">Against the Spread (ATS)</option>
              <option value="BOTH">Moneyline/ATS (Use Spread if available)</option>
            </select>
          </div>



          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Campaign Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="STANDARD">Standard</option>
              <option value="SURVIVOR">Survivor Mode (One pick/week, lose = eliminated)</option>
              <option value="CONFIDENCE">Confidence Points</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Enable Tiebreaker Features</label>
            <div className="flex items-center gap-2 mt-2 mb-4">
              <input type="checkbox" checked={useTiebreaker} onChange={e => setUseTiebreaker(e.target.checked)} className="w-5 h-5" />
              <span className="text-zinc-300">Allow users to enter total points prediction for tiebreaker games</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks in Campaign</label>
            <input
              type="number"
              min="1"
              value={totalWeeks}
              onChange={e => setTotalWeeks(parseInt(e.target.value) || 1)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            />
          </div>

          {/* Campaign Schedule */}
          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Visible Date (When users can see and sign up)</label>
                <input
                  type="datetime-local"
                  value={visibleDateStr}
                  onChange={e => setVisibleDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Games Begin Date</label>
                <input
                  type="datetime-local"
                  value={gamesBeginDateStr}
                  onChange={e => setGamesBeginDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={endDateStr}
                  onChange={e => setEndDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
            </div>
          </div>

                    <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium text-white mb-4">Access Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-[#18181A] text-[#22c55e] focus:ring-[#22c55e]"
                  />
                  Private Campaign
              </label>
              {isPrivate && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Join Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="Enter a secret code to join"
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              )}
            </div>
          </div>
          {/* Theme Settings */}
          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium text-white mb-4">White Label / Theme Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Theme Title</label>
                <input
                  type="text"
                  value={themeTitle}
                  onChange={e => setThemeTitle(e.target.value)}
                  placeholder="Leave blank to use Campaign Name"
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Theme Subtitle</label>
                <input
                  type="text"
                  value={themeSubtitle}
                  onChange={e => setThemeSubtitle(e.target.value)}
                  placeholder="Optional subtitle"
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themePrimaryColor}
                    onChange={e => setThemePrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-zinc-400 text-sm">{themePrimaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Logo Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setThemeLogoFile(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </form>
      </div>
    </div>
  );
}
