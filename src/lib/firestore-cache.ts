import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const memoryCache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const now = Date.now();
  const memEntry = memoryCache.get(key);
  if (memEntry && now - memEntry.timestamp < ttlMs) {
    return memEntry.data;
  }

  try {
    const raw = sessionStorage.getItem(`chainlink_cache_${key}`);
    if (raw) {
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (now - parsed.timestamp < ttlMs) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch (e) {
    // Session storage unavailable or invalid
  }

  return null;
}

export function setCached<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    timestamp: Date.now(),
    data
  };
  memoryCache.set(key, entry);

  try {
    sessionStorage.setItem(`chainlink_cache_${key}`, JSON.stringify(entry));
  } catch (e) {
    // Session storage space exceeded or unavailable
  }
}

export async function getShopItemsCached(ttlMs: number = DEFAULT_TTL_MS): Promise<any[]> {
  const cacheKey = 'shopItems';
  const cached = getCached<any[]>(cacheKey, ttlMs);
  if (cached) return cached;

  if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
    const mockItems = [
      { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring.', cost: 500, type: 'AVATAR_RING', active: true, image: 'border-yellow-500' },
      { id: 'banner_neon', name: 'Neon Banner', description: 'Bright profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' },
    ];
    setCached(cacheKey, mockItems);
    return mockItems;
  }

  try {
    const snap = await getDocs(collection(db, 'shopItems'));
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCached(cacheKey, items);
    return items;
  } catch (err) {
    console.error('Error fetching cached shopItems', err);
    return [];
  }
}

export async function getSponsorsCached(ttlMs: number = DEFAULT_TTL_MS): Promise<any[]> {
  const cacheKey = 'active_sponsors';
  const cached = getCached<any[]>(cacheKey, ttlMs);
  if (cached) return cached;

  try {
    const q = query(collection(db, 'sponsors'), where('active', '==', true));
    const snap = await getDocs(q);
    const sponsors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCached(cacheKey, sponsors);
    return sponsors;
  } catch (err) {
    console.warn('Error fetching cached sponsors', err);
    return [];
  }
}

export async function getAnnouncementsCached(ttlMs: number = DEFAULT_TTL_MS): Promise<any[]> {
  const cacheKey = 'active_announcements';
  const cached = getCached<any[]>(cacheKey, ttlMs);
  if (cached) return cached;

  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const active = docs.filter((d: any) => d.active === true);
    setCached(cacheKey, active);
    return active;
  } catch (err) {
    console.error('Error fetching cached announcements', err);
    return [];
  }
}
