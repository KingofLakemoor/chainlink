import React, { useState, useEffect } from 'react';
import { COSMETICS_CATALOG } from '../index';
import { 
  CosmeticItem, 
  CosmeticCategory, 
  SpokeOrigin, 
  UserCosmeticsProfile, 
  UserEquippedCosmetics 
} from '../types';
import { Club602Avatar } from './Club602Avatar';
import { Club602Nameplate } from './Club602Nameplate';
import { Club602Banner } from './Club602Banner';
import { CosmeticOriginBadge } from './CosmeticOriginBadge';
import { isCosmeticUnlocked, getCosmeticUnlockRequirement, isCosmeticPurchasable } from '../index';

export interface Club602LockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  spokeId: SpokeOrigin;
  onSaveCosmetics?: (equipped: UserEquippedCosmetics, scope: 'global' | 'spoke') => Promise<void>;
  onPurchaseCosmetic?: (cosmeticId: string, cost: number) => Promise<boolean>;
  className?: string;
}

const CATEGORIES: { key: CosmeticCategory; label: string; icon: string }[] = [
  { key: 'TITLE', label: 'Titles', icon: '🏷️' },
  { key: 'AVATAR_RING', label: 'Avatar Frames', icon: '⭕' },
  { key: 'NAME_GRADIENT', label: 'Name Colors', icon: '✨' },
  { key: 'BADGE', label: 'Pins & Badges', icon: '🛡️' },
  { key: 'PROFILE_BANNER', label: 'Hero Banners', icon: '🖼️' },
];

export const Club602LockerModal: React.FC<Club602LockerModalProps> = ({
  isOpen,
  onClose,
  user,
  spokeId,
  onSaveCosmetics,
  onPurchaseCosmetic,
  className = ''
}) => {
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>('TITLE');
  const [applyScope, setApplyScope] = useState<'global' | 'spoke'>('spoke');
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [selectedRing, setSelectedRing] = useState<string>('');
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [selectedGradient, setSelectedGradient] = useState<string>('');
  const [selectedBanner, setSelectedBanner] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;
    const spokeOverrides = user.spokeCosmetics?.[spokeId];
    const hasSpokeOverride = Boolean(spokeOverrides && Object.keys(spokeOverrides).length > 0);
    setApplyScope(hasSpokeOverride ? 'spoke' : 'global');

    setSelectedTitle(spokeOverrides?.TITLE || user.equippedCosmetics?.TITLE || user.title || '');
    setSelectedRing(spokeOverrides?.AVATAR_RING || user.equippedCosmetics?.AVATAR_RING || user.avatarFrame || '');
    setSelectedBadge(spokeOverrides?.BADGE || user.equippedCosmetics?.BADGE || user.badge || '');
    setSelectedGradient(spokeOverrides?.NAME_GRADIENT || user.equippedCosmetics?.NAME_GRADIENT || user.nameGradient || '');
    setSelectedBanner(spokeOverrides?.PROFILE_BANNER || user.equippedCosmetics?.PROFILE_BANNER || user.profileBanner || '');
  }, [isOpen, user, spokeId]);

  if (!isOpen) return null;

  const currentPreviewUser = {
    ...user,
    title: selectedTitle,
    avatarFrame: selectedRing,
    badge: selectedBadge,
    nameGradient: selectedGradient,
    profileBanner: selectedBanner,
    equippedCosmetics: {
      TITLE: selectedTitle,
      AVATAR_RING: selectedRing,
      BADGE: selectedBadge,
      NAME_GRADIENT: selectedGradient,
      PROFILE_BANNER: selectedBanner
    }
  };

  const categoryItems = COSMETICS_CATALOG.filter(item => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getSelectedIdForCategory = (cat: CosmeticCategory) => {
    switch (cat) {
      case 'TITLE': return selectedTitle;
      case 'AVATAR_RING': return selectedRing;
      case 'BADGE': return selectedBadge;
      case 'NAME_GRADIENT': return selectedGradient;
      case 'PROFILE_BANNER': return selectedBanner;
      default: return '';
    }
  };

  const handleSelectItem = (item: CosmeticItem) => {
    const isUnlocked = isCosmeticUnlocked(item, user);
    if (!isUnlocked) return;

    const currentSelected = getSelectedIdForCategory(item.category);
    const nextVal = currentSelected === item.id ? '' : item.id;

    switch (item.category) {
      case 'TITLE': setSelectedTitle(nextVal); break;
      case 'AVATAR_RING': setSelectedRing(nextVal); break;
      case 'BADGE': setSelectedBadge(nextVal); break;
      case 'NAME_GRADIENT': setSelectedGradient(nextVal); break;
      case 'PROFILE_BANNER': setSelectedBanner(nextVal); break;
    }
  };

  const handleSave = async () => {
    if (!onSaveCosmetics) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await onSaveCosmetics({
        TITLE: selectedTitle || undefined,
        AVATAR_RING: selectedRing || undefined,
        BADGE: selectedBadge || undefined,
        NAME_GRADIENT: selectedGradient || undefined,
        PROFILE_BANNER: selectedBanner || undefined
      }, applyScope);
      onClose();
    } catch (err) {
      console.error('Error saving cosmetics:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm ${className}`}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Club 602 Locker</span>
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400">
                {spokeId}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Customize your cross-network look & titles</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Hero Preview Bar */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 bg-zinc-900/40">
          <Club602Banner user={currentPreviewUser} height="sm" presentationContext="hero" className="rounded-2xl border border-zinc-800 p-4 flex items-center gap-4">
            <Club602Avatar user={currentPreviewUser} size="lg" presentationContext="hero" />
            <div className="min-w-0 flex-1">
              <Club602Nameplate user={currentPreviewUser} size="lg" presentationContext="hero" />
            </div>
            {/* Scope Switcher Pill */}
            <div className="bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setApplyScope('spoke')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  applyScope === 'spoke'
                    ? 'bg-cyan-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {spokeId.toUpperCase()} Only
              </button>
              <button
                type="button"
                onClick={() => setApplyScope('global')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  applyScope === 'global'
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🌐 Everywhere
              </button>
            </div>
          </Club602Banner>
        </div>

        {/* Category Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.key
                    ? 'bg-zinc-100 text-zinc-950 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 w-full sm:w-48"
          />
        </div>

        {/* Catalog Items Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categoryItems.map(item => {
            const isUnlocked = isCosmeticUnlocked(item, user);
            const isSelected = getSelectedIdForCategory(item.category) === item.id;
            const purchasable = isCosmeticPurchasable(item);

            return (
              <div
                key={item.id}
                onClick={() => isUnlocked && handleSelectItem(item)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                    : isUnlocked
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                    : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CosmeticOriginBadge origin={item.originSpoke} />
                    {isSelected ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded-md">
                        Equipped
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[10px] font-bold text-zinc-400">Owned</span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                        🔒 Locked
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">{item.name}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                    {item.description || getCosmeticUnlockRequirement(item)}
                  </p>
                </div>

                {!isUnlocked && purchasable && onPurchaseCosmetic && (
                  <button
                    type="button"
                    disabled={isPurchasing === item.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsPurchasing(item.id);
                      try {
                        await onPurchaseCosmetic(item.id, item.cost || 0);
                      } finally {
                        setIsPurchasing(null);
                      }
                    }}
                    className="w-full mt-2 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    {isPurchasing === item.id ? 'Unlocking...' : `Unlock for ${(item.cost || 0).toLocaleString()} Links`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono tracking-wide shadow-lg shadow-cyan-500/20 transition-all"
          >
            {isSaving ? 'Saving...' : 'Equip & Save'}
          </button>
        </div>

      </div>
    </div>
  );
};
