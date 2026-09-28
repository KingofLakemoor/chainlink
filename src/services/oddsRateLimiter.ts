import * as firebaseAdmin from '../lib/firebase-admin.js';

let getAdminDb = () => firebaseAdmin.adminDb;

// Export for mocking in tests
export function setAdminDbMockForRateLimiter(mock: any) {
  getAdminDb = () => mock;
}

const MAX_DAILY_ODDS_API_CALLS = 2;

// In-memory fallback if Firestore is unavailable or in unit test mode without Firestore
let inMemoryDateKey = '';
let inMemoryCallCount = 0;

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function resetInMemoryOddsRateLimiter() {
  inMemoryDateKey = getTodayKey();
  inMemoryCallCount = 0;
}

/**
 * Checks whether The Odds API can be called without exceeding the daily limit (max 2 calls per day).
 */
export async function canMakeOddsApiCall(): Promise<boolean> {
  const today = getTodayKey();
  const adminDb = getAdminDb();

  const isUnmockedTestDb = process.env.NODE_ENV === 'test' && adminDb === firebaseAdmin.adminDb;

  if (!adminDb || isUnmockedTestDb) {
    if (inMemoryDateKey !== today) {
      inMemoryDateKey = today;
      inMemoryCallCount = 0;
    }
    return inMemoryCallCount < MAX_DAILY_ODDS_API_CALLS;
  }

  try {
    const docRef = adminDb.collection('systemSettings').doc('oddsApiUsage');
    if (typeof docRef?.get !== 'function') {
      if (inMemoryDateKey !== today) {
        inMemoryDateKey = today;
        inMemoryCallCount = 0;
      }
      return inMemoryCallCount < MAX_DAILY_ODDS_API_CALLS;
    }

    const snap = await docRef.get();
    if (!snap?.exists) {
      return true;
    }

    const data = snap.data ? snap.data() : {};
    if (data?.dateKey !== today) {
      return true;
    }

    const count = data?.callCount || 0;
    if (count >= MAX_DAILY_ODDS_API_CALLS) {
      console.warn(`[OddsRateLimiter] The Odds API daily limit of ${MAX_DAILY_ODDS_API_CALLS} calls reached for ${today} (${count} calls recorded).`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[OddsRateLimiter] Failed to read oddsApiUsage from Firestore, using in-memory fallback:', err);
    if (inMemoryDateKey !== today) {
      inMemoryDateKey = today;
      inMemoryCallCount = 0;
    }
    return inMemoryCallCount < MAX_DAILY_ODDS_API_CALLS;
  }
}

/**
 * Records a call to The Odds API, incrementing today's counter.
 */
export async function recordOddsApiCall(): Promise<number> {
  const today = getTodayKey();
  const adminDb = getAdminDb();

  if (inMemoryDateKey !== today) {
    inMemoryDateKey = today;
    inMemoryCallCount = 0;
  }
  inMemoryCallCount++;

  const isUnmockedTestDb = process.env.NODE_ENV === 'test' && adminDb === firebaseAdmin.adminDb;

  if (!adminDb || isUnmockedTestDb) {
    return inMemoryCallCount;
  }

  try {
    const docRef = adminDb.collection('systemSettings').doc('oddsApiUsage');
    if (typeof docRef?.set !== 'function') {
      return inMemoryCallCount;
    }

    let newCount = 1;
    if (typeof docRef?.get === 'function') {
      const snap = await docRef.get();
      if (snap?.exists) {
        const data = snap.data ? snap.data() : {};
        if (data?.dateKey === today) {
          newCount = (data.callCount || 0) + 1;
        }
      }
    }

    await docRef.set({
      dateKey: today,
      callCount: newCount,
      lastCalledAt: Date.now(),
      maxAllowed: MAX_DAILY_ODDS_API_CALLS,
    }, { merge: true });

    return newCount;
  } catch (err) {
    console.warn('[OddsRateLimiter] Failed to record Odds API call in Firestore:', err);
    return inMemoryCallCount;
  }
}
