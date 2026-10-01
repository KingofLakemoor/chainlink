import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import shopItemsData from '../../shop_items.json';

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

export function clearCached(key?: string): void {
  if (key) {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`chainlink_cache_${key}`);
    } catch (e) {
      // Session storage unavailable
    }
  } else {
    memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('chainlink_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) {
      // Session storage unavailable
    }
  }
}

export async function getShopItemsCached(ttlMs: number = DEFAULT_TTL_MS): Promise<any[]> {
  const cacheKey = 'shopItems';
  const cached = getCached<any[]>(cacheKey, ttlMs);
  if (cached && cached.length > 0) return cached;

  let firestoreItems: any[] = [];
  try {
    if (!(import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY'))) {
      const snap = await getDocs(collection(db, 'shopItems'));
      firestoreItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.error('Error fetching cached shopItems from Firestore', err);
  }

  // Merge shop_items.json manifest items with live Firestore items so all catalog items are present
  const itemsMap = new Map<string, any>();
  (shopItemsData as any[]).forEach(item => {
    if (item && item.id) {
      itemsMap.set(item.id, item);
    }
  });

  firestoreItems.forEach(item => {
    if (item && item.id) {
      itemsMap.set(item.id, { ...(itemsMap.get(item.id) || {}), ...item });
    }
  });

  const merged = Array.from(itemsMap.values());
  setCached(cacheKey, merged);
  return merged;
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
