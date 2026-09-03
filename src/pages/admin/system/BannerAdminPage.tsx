import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth-context';
import { Button } from '../../../components/ui/button';
import { ExternalLink, ArrowRight, Save, CheckCircle2, Megaphone, Eye, AlertCircle } from 'lucide-react';

export interface PlayBannerConfig {
  active: boolean;
  message: string;
  subtext?: string;
  badgeText?: string;
  linkType: 'internal' | 'external' | 'none';
  linkUrl: string;
  ctaText: string;
  style: 'emerald' | 'cyan' | 'fuchsia' | 'amber' | 'indigo';
  updatedAt?: number;
  updatedBy?: string;
}

const DEFAULT_BANNER: PlayBannerConfig = {
  active: false,
  message: 'Welcome to ChainLink! Make your picks and build your winning streak.',
  subtext: 'Join the active Pick \'Em campaigns and challenge the leaderboard.',
  badgeText: 'FEATURED',
  linkType: 'internal',
  linkUrl: '/pickem',
  ctaText: 'Go to Pick \'Em',
  style: 'emerald',
};

const COLOR_STYLES = {
  emerald: {
    bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    button: 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  },
  cyan: {
    bg: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    button: 'bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
  },
  fuchsia: {
    bg: 'bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-200',
    badge: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
    button: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-zinc-950 font-bold',
    glow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)]',
  },
  amber: {
    bg: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    button: 'bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  },
  indigo: {
    bg: 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200',
    badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    button: 'bg-indigo-500 hover:bg-indigo-600 text-zinc-950 font-bold',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]',
  },
};

const QUICK_INTERNAL_LINKS = [
  { label: "Pick 'Em Page", value: '/pickem' },
  { label: 'Link4 Page', value: '/link4' },
  { label: 'Leaderboards', value: '/leaderboards' },
  { label: 'Link Shop', value: '/shop' },
  { label: 'Help & Rules', value: '/help' },
];

export default function BannerAdminPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<PlayBannerConfig>(DEFAULT_BANNER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadBannerConfig() {
      try {
        const docRef = doc(db, 'systemSettings', 'playBanner');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setConfig({ ...DEFAULT_BANNER, ...snap.data() });
        }
      } catch (err: any) {
        console.error('Failed to load play banner config:', err);
        setErrorMsg('Failed to load banner settings.');
      } finally {
        setLoading(false);
      }
    }
    loadBannerConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const docRef = doc(db, 'systemSettings', 'playBanner');
      const updatedConfig: PlayBannerConfig = {
        ...config,
        updatedAt: Date.now(),
        updatedBy: user?.email || user?.uid || 'admin',
      };

      await setDoc(docRef, updatedConfig);
      setConfig(updatedConfig);
      setSuccessMsg('Banner configuration saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to save banner config:', err);
      setErrorMsg(err.message || 'Failed to save banner config.');
    } finally {
      setSaving(false);
    }
  };

  const currentStyle = COLOR_STYLES[config.style] || COLOR_STYLES.emerald;

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading banner settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-zinc-100 font-display">Play Page Dismissable Banner</h2>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Configure a promotional or informational banner shown at the top of the main Play dashboard. Users can dismiss the banner until you save a new update.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Status:</span>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${config.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {config.active ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="mt-6 mb-8">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Eye className="w-4 h-4 text-cyan-400" /> Live Preview
          </div>
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 ${currentStyle.bg} ${currentStyle.glow}`}>
            <div className="flex items-start gap-3 flex-1">
              {config.badgeText && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shrink-0 ${currentStyle.badge}`}>
                  {config.badgeText}
                </span>
              )}
              <div>
                <h4 className="font-bold text-sm text-zinc-100 leading-snug">{config.message || 'Your banner message here'}</h4>
                {config.subtext && <p className="text-xs text-zinc-300/80 mt-0.5">{config.subtext}</p>}
              </div>
            </div>

            {config.linkType !== 'none' && config.linkUrl && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className={`px-4 py-2 text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors ${currentStyle.button}`}>
                  {config.ctaText || 'Learn More'}
                  {config.linkType === 'external' ? <ExternalLink className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-zinc-900/80 rounded-lg border border-zinc-800">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.active}
                onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
            <div>
              <span className="text-sm font-bold text-zinc-100">Enable Banner on Play Page</span>
              <p className="text-xs text-zinc-400">When checked, this banner will be displayed to all users on the Play Dashboard.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Badge Label</label>
              <input
                type="text"
                value={config.badgeText || ''}
                onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                placeholder="e.g. FEATURED, ANNOUNCEMENT, NEW"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Color Style</label>
              <select
                value={config.style}
                onChange={(e) => setConfig({ ...config, style: e.target.value as any })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="emerald">Emerald Green (Default)</option>
                <option value="cyan">Cyan Blue</option>
                <option value="fuchsia">Fuchsia Pink</option>
                <option value="amber">Amber Gold</option>
                <option value="indigo">Indigo Purple</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Main Banner Title / Headline *</label>
            <input
              type="text"
              required
              value={config.message}
              onChange={(e) => setConfig({ ...config, message: e.target.value })}
              placeholder="Headline text..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subtitle / Description (Optional)</label>
            <input
              type="text"
              value={config.subtext || ''}
              onChange={(e) => setConfig({ ...config, subtext: e.target.value })}
              placeholder="Additional detail or subtext..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="border-t border-zinc-800/80 pt-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200">Link & Action Configuration</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Link Destination Type</label>
                <select
                  value={config.linkType}
                  onChange={(e) => setConfig({ ...config, linkType: e.target.value as any })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="internal">Internal App Page (e.g. /pickem, /link4)</option>
                  <option value="external">External Website URL (e.g. https://...)</option>
                  <option value="none">No Link (Display Info Only)</option>
                </select>
              </div>

              {config.linkType !== 'none' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Button CTA Text</label>
                  <input
                    type="text"
                    value={config.ctaText}
                    onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                    placeholder="e.g. Check it out, Join Campaign"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              )}
            </div>

            {config.linkType !== 'none' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Target Link URL</label>
                <input
                  type="text"
                  required
                  value={config.linkUrl}
                  onChange={(e) => setConfig({ ...config, linkUrl: e.target.value })}
                  placeholder={config.linkType === 'external' ? 'https://example.com/promo' : '/pickem'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono text-xs"
                />

                {config.linkType === 'internal' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs text-zinc-500 font-medium">Quick Presets:</span>
                    {QUICK_INTERNAL_LINKS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setConfig({ ...config, linkUrl: preset.value })}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          config.linkUrl === preset.value
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 font-semibold'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
            <div className="text-xs text-zinc-500">
              {config.updatedAt && (
                <p>Last updated: {new Date(config.updatedAt).toLocaleString()} {config.updatedBy ? `by ${config.updatedBy}` : ''}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-6 h-11 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Banner Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
