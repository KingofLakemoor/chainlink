import { executeRollover, getOrBuildMonthlySnapshot } from './services/monthlyRollover.js';
import { processPendingNotifications } from './services/notificationProcessor.js';
import { gradeBrackets, setBracketWinner } from './services/bracketGrader.js';
import { fetchAndStoreTuesdayGridironLines, getCurrentFootballWeek, getGridironLinesLockTime } from './services/gridironIngestion.js';
import { gradeGridironWeek, updateGridironLeaderboard } from './services/gridironGrader.js';
import { GridironPick, GridironEntry } from './types/gridiron.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { adminAuth, adminDb, adminMessaging } from './lib/firebase-admin.js';
import { scrapeLeagueSchedules, syncLeagueSchedules } from './services/scheduleProcessor.js';
import { gradeMatchups } from './services/grader.js';
import { gradeLink4Matchups, payoutLink4Segment, aggregateAndPurgeLink4Segment, purgeCompletedLink4Segments } from './services/link4Grader.js';
import { gradePickemMatchups, payoutPickemCampaign } from './services/pickemGrader.js';
import { getStaticPickemLeaderboard, generateAndSavePickemLeaderboard } from './services/pickemLeaderboardService.js';
import { updateAllProps } from './services/propGrader.js';
import { autoGenerateNFLProps } from './services/propGenerator.js';
import { syncTennisOdds, syncSoccerOdds } from './services/oddsProcessor.js';
import { getSharpApiTennisComparison } from './services/sharpApiFallback.js';
import { getActiveLeagues, ALL_SYSTEM_LEAGUES } from './services/leagueService.js';
import {
  fetchEquibaseScraperData,
  syncEquibaseRacesToMatchups,
  runDailyHorseRacingScheduleSync,
  getApifyToken,
  parseEquibaseItems,
  EQUIBASE_ACTOR_ID
} from './services/apifyHorseRacingService.js';
import { isMatchupLocked, getMatchupStartTime } from './utils/matchupUtils.js';
import { isBracketLocked } from './utils/bracketUtils.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia' as any, // Cast to any to bypass TS error for newer stripe versions
});

export const apiRouter = express.Router();

let cachedProgress = { raised: 0, goal: 1000, pot: 0, maxPot: 500, timestamp: 0 };
const CHARITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let playBannerCache: { data: any; time: number } | null = null;
const PLAY_BANNER_CACHE_TTL = 30 * 1000;

let activeMatchupsCache: { data: any[]; time: number } | null = null;
const ACTIVE_MATCHUPS_CACHE_TTL = 60 * 1000;
let activeMatchupsInFlight: Promise<any[]> | null = null;

const link4MatchupsCache = new Map<string, { data: any[]; time: number }>();
const LINK4_MATCHUPS_CACHE_TTL = 60 * 1000;
const link4MatchupsInFlight = new Map<string, Promise<any[]>>();

const matchupsByIdCache = new Map<string, { data: any; time: number }>();
const MATCHUPS_BY_ID_CACHE_TTL = 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

export function invalidateMatchupCaches() {
  activeMatchupsCache = null;
  link4MatchupsCache.clear();
  matchupsByIdCache.clear();
}

function pruneMapCache<K, V>(map: Map<K, { data: V; time: number }>, ttl: number, maxEntries: number) {
  const now = Date.now();
  for (const [key, value] of map.entries()) {
    if (now - value.time > ttl) {
      map.delete(key);
    }
  }
  if (map.size > maxEntries) {
    const overflow = map.size - maxEntries;
    const keys = Array.from(map.keys()).slice(0, overflow);
    keys.forEach(k => map.delete(k));
  }
}

apiRouter.get('/charity/progress', async (req, res) => {
  try {
    if (Date.now() - cachedProgress.timestamp < CHARITY_CACHE_TTL) {
      return res.json({
        raised: cachedProgress.raised,
        goal: cachedProgress.goal,
        pot: cachedProgress.pot,
        maxPot: cachedProgress.maxPot
      });
    }

    let raised = cachedProgress.raised;
    let goal = cachedProgress.goal;
    try {
      const response = await fetch('http://act.autismcenter.org/goto/ashweaver');
      const html = await response.text();
      const raisedMatch = html.match(/class="amount-raised-value"[^>]*>\s*\$?([\d,.]+)/i);
      const goalMatch = html.match(/class="total-goal-value"[^>]*>\s*\$?([\d,.]+)/i);
      if (raisedMatch) raised = parseFloat(raisedMatch[1].replace(/,/g, ''));
      if (goalMatch) goal = parseFloat(goalMatch[1].replace(/,/g, ''));
    } catch (e) {
      console.error('Failed to scrape charity page', e);
    }

    let pot = 0;
    try {
      const targetCampaignIds = new Set<string>(['yes_day_2026', 'charity']);
      const campaignSnap = await adminDb.collection('pickemCampaigns').where('name', '==', 'YES Day Walk for Autism 2026').limit(10).get();
      campaignSnap.forEach(cDoc => targetCampaignIds.add(cDoc.id));

      const processedParticipants = new Set<string>();

      for (const cid of targetCampaignIds) {
        const snapshot = await adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          const pId = data.participantId || data.userId || doc.id.split('_')[1];
          if (pId && processedParticipants.has(pId)) return;
          if (pId) processedParticipants.add(pId);

          const joinedAt = new Date(data.joinedAt || data.createdAt || Date.now());
          // August 31, 2026 midnight AZ time is 2026-08-31T07:00:00Z
          if (joinedAt < new Date('2026-08-31T07:00:00Z')) {
            pot += 15;
          } else {
            pot += 10;
          }
        });
      }
    } catch (e) {
      console.error('Failed to calculate pot', e);
    }
    
    if (pot > 500) pot = 500;

    cachedProgress = { raised, goal, pot, maxPot: 500, timestamp: Date.now() };
    res.json({ raised, goal, pot, maxPot: 500 });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});




const validateAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    (req as any).uid = decodedToken.uid;
    next();
  } catch (e: any) {
    console.error("Auth validation error:", e.message);
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};






apiRouter.get("/users/check-username", async (req, res) => {
  try {
    const { username, excludeUid } = req.query;
    if (!username || typeof username !== 'string') {
      return res.json({ exists: false });
    }
    const snap = await adminDb.collection('users').where('usernameLower', '==', username.toLowerCase()).get();
    if (snap.empty) {
      return res.json({ exists: false });
    }
    if (excludeUid && typeof excludeUid === 'string') {
      const isOtherUser = snap.docs.some(doc => doc.id !== excludeUid);
      return res.json({ exists: isOtherUser });
    }
    return res.json({ exists: true });
  } catch (error) {
    console.error('Error checking username', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


let publicUsersCache: any = null;
let publicUsersCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

apiRouter.get("/users/public", async (req, res) => {
  try {
    const { uids } = req.query;
    let snap;
    if (uids && typeof uids === 'string') {
      const uidList = uids.split(',').slice(0, 50); // limit to avoid massive queries
      if (uidList.length === 0) return res.json({ users: [] });
      const refs = uidList.map(uid => adminDb.collection('users').doc(uid));
      snap = await adminDb.getAll(...refs);
      
      const docs = Array.isArray(snap) ? snap : snap.docs;
      const users = docs.map(doc => {
        if (!doc.exists) return null;
        const data = doc.data();
        if (!data) return null;

        return {
          id: doc.id,
          username: data.username,
          name: data.name,
          image: data.image,
          stats: data.stats,
          allTimeStats: data.allTimeStats,
          allTimeBest: data.allTimeBest,
          historicalStats: data.historicalStats,
          equippedCosmetics: data.equippedCosmetics,
          role: data.role,
          status: data.status,
          createdAt: data.createdAt,
        };
      }).filter(Boolean);

      return res.json({ users });
    } else {
      // Fetch all users (cached)
      if (publicUsersCache && Date.now() - publicUsersCacheTime < CACHE_TTL) {
        return res.json({ users: publicUsersCache, cached: true });
      }
      snap = await adminDb.collection('users').get();
      const docs = Array.isArray(snap) ? snap : snap.docs;
      const users = docs.map(doc => {
        if (!doc.exists) return null;
        const data = doc.data();
        if (!data) return null;

        return {
          id: doc.id,
          username: data.username,
          name: data.name,
          image: data.image,
          stats: data.stats,
          allTimeStats: data.allTimeStats,
          allTimeBest: data.allTimeBest,
          historicalStats: data.historicalStats,
          equippedCosmetics: data.equippedCosmetics,
          role: data.role,
          status: data.status,
          createdAt: data.createdAt,
        };
      }).filter(Boolean);
      
      publicUsersCache = users;
      publicUsersCacheTime = Date.now();
      
      return res.json({ users });
    }
  } catch (error) {
    console.error('Error fetching public users', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

apiRouter.get("/proxy/scriptless-matchups", async (req, res) => {
  try {
    const upstreamRes = await fetch("https://scriptless.club602.com/api/chainlink/matchups", {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: `Upstream error: ${upstreamRes.statusText}` });
    }
    const data = await upstreamRes.json();
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json(data);
  } catch (err: any) {
    console.error("Error proxying scriptless matchups:", err);
    return res.status(502).json({ error: "Failed to fetch from scriptless API", details: err.message });
  }
});

apiRouter.post("/referral/increment", validateAuth, async (req, res) => {
  try {
    const { referrerId } = req.body;
    const uid = (req as any).uid;

    if (!referrerId || typeof referrerId !== 'string') {
      return res.status(400).json({ success: false });
    }

    if (uid === referrerId) {
      return res.status(400).json({ success: false, error: 'Cannot refer yourself' });
    }

    if (!adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const { FieldValue } = await import('firebase-admin/firestore');

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const userData = userDoc.data();
      if (userData?.referralGranted) {
        throw new Error("Referral already granted by this user");
      }

      const referrerRef = adminDb.collection('users').doc(referrerId);

            const currentMonthStr = new Date().toISOString().slice(0, 7);
      const monthlyStatsRef = adminDb.collection('settings').doc(`monthlyStats_${currentMonthStr}`);
      
      transaction.update(userRef, { referralGranted: true, referralGrantedAt: Date.now(), referredBy: referrerId });
      transaction.set(monthlyStatsRef, { referrals: FieldValue.increment(1) }, { merge: true });
      transaction.update(referrerRef, { referralsCount: FieldValue.increment(1) });
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error incrementing referral', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

const validateAdminOrApiKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // 1. Google Cloud Scheduler / AppEngine cron system headers
    if (req.headers['x-cloudscheduler'] === 'true' || req.headers['x-appengine-cron'] === 'true') {
      return next();
    }

    const queryApiKey = (req.query?.apiKey || req.query?.key) as string | undefined;
    const headerApiKey = (req.headers['x-api-key'] || req.headers['api-key']) as string | undefined;
    const validApiKeys = [
      process.env.SCRIPTLESS_API_KEY,
      process.env.ADMIN_API_KEY,
      process.env.CRON_SECRET,
      process.env.API_KEY
    ].filter(Boolean) as string[];

    if ((headerApiKey && validApiKeys.includes(headerApiKey)) || (queryApiKey && validApiKeys.includes(queryApiKey))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();

      if (validApiKeys.includes(token)) {
        return next();
      }

      // Check if it's a Google Cloud OIDC token from Cloud Scheduler
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com' || payload.email_verified === true) {
            return next();
          }
        }
      } catch (e) {}

      if (adminAuth && adminDb) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          const uid = decodedToken.uid;
          const userDoc = await adminDb.collection('users').doc(uid).get();
          if (userDoc.exists && userDoc.data()?.role === 'ADMIN') {
            (req as any).uid = uid;
            return next();
          }
        } catch (e) {}
      }
    }

    return res.status(401).json({ success: false, error: 'Unauthorized: Admin access or valid API key required' });
  } catch (e: any) {
    console.error('validateAdminOrApiKey Error:', e);
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};

const validateAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check custom claims first (fastest, 0 DB read)
    if (decodedToken.role === 'ADMIN' || decodedToken.admin === true) {
      (req as any).uid = uid;
      return next();
    }

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    // Set custom user claims so subsequent requests avoid Firestore document lookups
    try {
      await adminAuth.setCustomUserClaims(uid, { role: 'ADMIN', admin: true });
    } catch (claimErr) {
      console.warn("Failed to setCustomUserClaims during validateAdmin:", claimErr);
    }

    (req as any).uid = uid;
    next();
  } catch (e: any) {
    console.error("Admin validation error:", e.message);
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};

apiRouter.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { itemType, amount } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    let priceData: any | undefined;
    let metadata: Record<string, string> = { uid, itemType };

    let mode: 'payment' | 'subscription' = 'payment';

    if (itemType === 'links') {
      let priceInCents = 0;
      let productName = '';
      if (amount === 150) {
        priceInCents = 525;
        productName = '150 Links Pack';
      } else if (amount === 350) {
        priceInCents = 1049;
        productName = '350 Links Pack';
      } else if (amount === 1050) {
        priceInCents = 2999;
        productName = '1050 Links Pack';
      } else if (amount === 1800) {
        priceInCents = 4999;
        productName = '1800 Links Pack';
      } else {
        return res.status(400).json({ success: false, error: 'Invalid links amount' });
      }

      priceData = {
        currency: 'usd',
        product_data: { name: productName },
        unit_amount: priceInCents,
      };
      metadata.amount = amount.toString();
    } else if (itemType === 'premium') {
      priceData = {
        currency: 'usd',
        product_data: { name: 'ChainLink Pro Subscription' },
        unit_amount: 499,
        recurring: {
          interval: 'month',
        },
      };
      mode = 'subscription';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid item type' });
    }

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${req.headers.origin || (req.protocol + '://' + req.get('host'))}/shop?success=true`,
      cancel_url: `${req.headers.origin || (req.protocol + '://' + req.get('host'))}/shop?canceled=true`,
    };

    if (mode === 'subscription') {
      sessionData.subscription_data = { metadata };
      sessionData.metadata = metadata;
    } else {
      sessionData.metadata = metadata;
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log("Stripe session created:", session.id); res.json({ success: true, id: session.id, url: session.url });
  } catch (e: any) {
    console.error("Create checkout session error:", e.message, e);
    require('fs').appendFileSync('stripe-errors.log', new Date().toISOString() + " - " + e.message + "\n");
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/link4/purge-completed", validateAdmin, async (req, res) => {
  try {
    const { segmentId, force } = req.body || {};
    if (segmentId) {
      const result = await aggregateAndPurgeLink4Segment(segmentId, !!force);
      return res.json({ success: true, result });
    } else {
      const result = await purgeCompletedLink4Segments();
      return res.json({ success: true, result });
    }
  } catch (e: any) {
    console.error('Link4 purge error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/link4/picks/:segmentId", async (req, res) => {
  try {
    const { segmentId } = req.params;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection('link4Picks').where('segmentId', '==', segmentId).get();
    const picks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, picks });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/update-premium", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, premium } = req.body;
    if (!targetUserId || typeof premium !== 'boolean') {
      return res.status(400).json({ success: false, error: "Invalid targetUserId or premium status" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    await userRef.update({
      premium: premium,
      updatedAt: Date.now()
    });

    res.json({ success: true, premium });
  } catch (e: any) {
    console.error("Update premium error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/update-cosmetics", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, inventory } = req.body;
    if (!targetUserId || !Array.isArray(inventory)) {
      return res.status(400).json({ success: false, error: "Invalid targetUserId or inventory array" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    await userRef.update({
      inventory: inventory,
      updatedAt: Date.now()
    });

    res.json({ success: true, inventory });
  } catch (e: any) {
    console.error("Update cosmetics error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ==========================================
   ADMIN SHOP CATALOG & MANIFEST MANAGMENT
   ========================================== */

apiRouter.post("/admin/shop/export-manifest", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const snap = await adminDb.collection('shopItems').get();
    let items = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        cost: data.cost ?? 0,
        type: data.type || 'PROFILE_BANNER',
        active: data.active ?? true,
        forSale: data.forSale ?? true,
        image: data.image || '',
        featured: !!data.featured,
        preview: data.preview || data.image || '',
        order: data.order ?? 99,
        collectionId: data.collectionId || '',
        ...(data.requiresShipping ? { requiresShipping: true } : {}),
        ...(data.premiumOnly ? { premiumOnly: true } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.thumbnail ? { thumbnail: data.thumbnail } : {})
      };
    });

    items.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id));

    const catalogPath = path.resolve(process.cwd(), 'shop_items.json');
    fs.writeFileSync(catalogPath, JSON.stringify(items, null, 2), 'utf-8');

    res.json({ success: true, count: items.length, items });
  } catch (e: any) {
    console.error("Export shop manifest error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/shop/seed", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const { force } = req.body || {};

    const catalogPath = path.resolve(process.cwd(), 'shop_items.json');
    if (!fs.existsSync(catalogPath)) {
      return res.status(404).json({ success: false, error: "shop_items.json file not found" });
    }

    const fileContent = fs.readFileSync(catalogPath, 'utf-8');
    const items = JSON.parse(fileContent);

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      const { id, ...data } = item;
      const docRef = adminDb.collection("shopItems").doc(id);
      const docSnap = await docRef.get();
      const timestamp = Date.now();

      if (docSnap.exists) {
        const dbData = docSnap.data() || {};
        let itemData: any = {
          ...data,
          createdAt: dbData.createdAt || timestamp,
          updatedAt: timestamp
        };

        if (!force) {
          if (dbData.active !== undefined) itemData.active = dbData.active;
          if (dbData.forSale !== undefined) itemData.forSale = dbData.forSale;
          if (dbData.featured !== undefined) itemData.featured = dbData.featured;
          if (dbData.premiumOnly !== undefined) itemData.premiumOnly = dbData.premiumOnly;
          if (dbData.cost !== undefined) itemData.cost = dbData.cost;
        }

        await docRef.update(itemData);
        updatedCount++;
      } else {
        const itemData = {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await docRef.set(itemData);
        createdCount++;
      }
    }

    res.json({ success: true, createdCount, updatedCount });
  } catch (e: any) {
    console.error("Seed shop items error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/shop/import", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const { items, overwrite = true } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Payload must include a non-empty array of items." });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item || typeof item !== 'object') {
        errors.push(`Item at index ${index} is invalid.`);
        continue;
      }

      const rawId = item.id || item.docId || item.key;
      if (!rawId || typeof rawId !== 'string') {
        errors.push(`Item at index ${index} (${item.name || 'unnamed'}) is missing a valid id.`);
        continue;
      }

      const id = rawId.trim().toLowerCase().replace(/\s+/g, '_');
      const docRef = adminDb.collection("shopItems").doc(id);
      const docSnap = await docRef.get();
      const timestamp = Date.now();

      const itemPayload = {
        id,
        name: item.name || id,
        description: item.description || '',
        cost: Math.max(0, Number(item.cost) || 0),
        type: item.type || 'PROFILE_BANNER',
        category: item.category || 'Uncategorized',
        active: item.active !== false,
        forSale: item.forSale !== false,
        premiumOnly: !!item.premiumOnly,
        featured: !!item.featured,
        requiresShipping: !!item.requiresShipping,
        image: item.image || '',
        thumbnail: item.thumbnail || '',
        preview: item.preview || item.image || '',
        order: Number(item.order) || 99,
        collectionId: item.collectionId || '',
        updatedAt: timestamp
      };

      if (docSnap.exists) {
        if (!overwrite) {
          skippedCount++;
          continue;
        }
        const existing = docSnap.data() || {};
        await docRef.set({
          ...itemPayload,
          createdAt: existing.createdAt || timestamp
        }, { merge: true });
        updatedCount++;
      } else {
        await docRef.set({
          ...itemPayload,
          createdAt: timestamp
        });
        createdCount++;
      }
    }

    res.json({ success: true, createdCount, updatedCount, skippedCount, errors });
  } catch (e: any) {
    console.error("Import shop items error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/pickem/submit-pick", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { campaignId, matchupId, week, pick, tiebreakerTotal, confidence } = req.body;

    if (!campaignId || !matchupId) {
      return res.status(400).json({ success: false, error: "Missing campaignId or matchupId" });
    }

    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    // Look up matchup to check if game is locked
    const matchupDoc = await adminDb.collection('pickemMatchups').doc(matchupId).get();
    if (matchupDoc.exists) {
      const matchup = matchupDoc.data()!;
      if (isMatchupLocked(matchup)) {
        return res.status(400).json({ success: false, error: "Game is locked. Cannot submit pick." });
      }
    }

    // Check campaign pick limit
    const targetWeek = Number(week) || 1;
    const docId = `${campaignId}_${targetWeek}_${matchupId}_${uid}`;
    const pickRef = adminDb.collection('pickemPicks').doc(docId);
    const existingSnap = await pickRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};

    if (pick?.teamId && !existingData?.pick?.teamId) {
      const campDoc = await adminDb.collection('pickemCampaigns').doc(campaignId).get();
      if (campDoc.exists) {
        const campaign = campDoc.data()!;
        const pickLimit = campaign.pickLimit || 0;
        if (pickLimit > 0 && campaign.name !== 'YES Day Walk for Autism 2026') {
          const userPicksSnap = await adminDb.collection('pickemPicks')
            .where('campaignId', '==', campaignId)
            .where('participantId', '==', uid)
            .where('week', '==', targetWeek)
            .get();
          const currentPicksCount = userPicksSnap.docs.filter(d => d.data().pick?.teamId && d.id !== docId).length;
          if (currentPicksCount >= pickLimit) {
            return res.status(400).json({
              success: false,
              error: `You have reached the maximum of ${pickLimit} picks for this week.`
            });
          }
        }
      }
    }

    // Auto-heal participant record if missing
    const pairId = `${campaignId}_${uid}`;
    const partRef = adminDb.collection('pickemParticipants').doc(pairId);
    const partDoc = await partRef.get();
    if (!partDoc.exists) {
      await partRef.set({
        campaignId,
        participantId: uid,
        joinedAt: Date.now()
      }, { merge: true });
    }

    const payload: any = {
      campaignId,
      participantId: uid,
      userId: uid,
      matchupId,
      week: targetWeek,
      status: existingData?.status || 'PENDING',
      pointsEarned: existingData?.pointsEarned || 0,
      submittedAt: Date.now(),
      createdAt: existingData?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (pick !== undefined) payload.pick = pick;
    else if (existingData?.pick) payload.pick = existingData.pick;

    if (tiebreakerTotal !== undefined) payload.tiebreakerTotal = tiebreakerTotal;
    else if (existingData?.tiebreakerTotal !== undefined) payload.tiebreakerTotal = existingData.tiebreakerTotal;

    if (confidence !== undefined) {
      payload.confidence = confidence;
      payload.pointsEarned = confidence;
    } else if (existingData?.confidence !== undefined) {
      payload.confidence = existingData.confidence;
    }

    await pickRef.set(payload, { merge: true });

    // Background sync of static leaderboard so newly submitted picks are immediately represented
    generateAndSavePickemLeaderboard(campaignId).catch(err => {
      console.warn('[apiRouter] Background leaderboard sync error after pick submission:', err);
    });

    res.json({ success: true, pickId: docId, pick: payload });
  } catch (e: any) {
    console.error("Submit pickem pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/pickem/clear-pick", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { campaignId, matchupId, week } = req.body;

    if (!campaignId || !matchupId) {
      return res.status(400).json({ success: false, error: "Missing campaignId or matchupId" });
    }

    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    // Look up matchup to check if game is locked
    const matchupDoc = await adminDb.collection('pickemMatchups').doc(matchupId).get();
    if (matchupDoc.exists) {
      const matchup = matchupDoc.data()!;
      if (isMatchupLocked(matchup)) {
        return res.status(400).json({ success: false, error: "Game is locked. Cannot clear pick." });
      }
    }

    // Delete pick document(s) for this user, campaign, and matchup
    const docId = `${campaignId}_${week || ''}_${matchupId}_${uid}`;
    const directRef = adminDb.collection('pickemPicks').doc(docId);
    const directDoc = await directRef.get();

    if (directDoc.exists) {
      await directRef.delete();
    } else {
      const query1 = adminDb.collection('pickemPicks')
        .where('campaignId', '==', campaignId)
        .where('matchupId', '==', matchupId)
        .where('participantId', '==', uid);
      const query2 = adminDb.collection('pickemPicks')
        .where('campaignId', '==', campaignId)
        .where('matchupId', '==', matchupId)
        .where('userId', '==', uid);

      const [snap1, snap2] = await Promise.all([query1.get(), query2.get()]);
      const docsToDelete = [...snap1.docs, ...snap2.docs];

      if (docsToDelete.length > 0) {
        const batch = adminDb.batch();
        docsToDelete.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Background sync of static leaderboard so cleared picks are immediately updated
    generateAndSavePickemLeaderboard(campaignId).catch(err => {
      console.warn('[apiRouter] Background leaderboard sync error after pick clear:', err);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Clear pickem pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Pickem Static Leaderboard endpoints
apiRouter.get("/pickem/leaderboard", async (req, res) => {
  try {
    const { campaignId, refresh } = req.query;
    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ success: false, error: "Missing required query parameter 'campaignId'" });
    }

    const leaderboard = await getStaticPickemLeaderboard(campaignId, refresh === 'true');
    res.json({ success: true, leaderboard });
  } catch (e: any) {
    console.error("Fetch pickem leaderboard error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post(["/pickem/leaderboard/sync", "/pickem/rebuild-leaderboard"], async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Missing required body parameter 'campaignId'" });
    }

    const leaderboard = await generateAndSavePickemLeaderboard(campaignId);
    res.json({ success: true, leaderboard });
  } catch (e: any) {
    console.error("Sync pickem leaderboard error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/admin/link-transactions", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const { username, startAfterId, limit: reqLimit } = req.query;
    const fetchLimit = Math.min(parseInt(reqLimit as string) || 100, 500);

    let query: FirebaseFirestore.Query = adminDb.collection('linkTransactions');

    if (username && typeof username === 'string' && username.trim() !== '') {
      query = query.where('username', '==', username.trim());
    }

    query = query.orderBy('createdAt', 'desc');

    if (startAfterId && typeof startAfterId === 'string') {
      const docSnap = await adminDb.collection('linkTransactions').doc(startAfterId).get();
      if (docSnap.exists) {
        query = query.startAfter(docSnap);
      }
    }

    const snap = await query.limit(fetchLimit).get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const hasMore = snap.docs.length === fetchLimit;

    res.json({ success: true, logs, hasMore });
  } catch (e: any) {
    console.error("Fetch Admin Link Transactions error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export async function ensureThePicksContest() {
  if (!adminDb) return;
  try {
    const contestRef = adminDb.collection("gridiron_3x3_contests").doc("the_picks");
    const docSnap = await contestRef.get();
    if (!docSnap.exists) {
      const contestData = {
        contestId: "the_picks",
        name: "The Picks",
        createdBy: "admin",
        inviteCode: "THEPIC",
        season: 2026,
        weekNumber: 1,
        participants: ["admin"],
        isPublic: false,
        createdAt: Date.now(),
        raceTo25: {
          active: true,
          startWeek: 1,
          targetWins: 25
        }
      };
      await contestRef.set(contestData, { merge: true });
      await updateGridironLeaderboard("the_picks");

      // Auto-populate line snapshot for 2026 Week 1 (Tuesday September 8th) if missing AND lock time reached
      const lockTime = getGridironLinesLockTime(2026, 1);
      if (Date.now() >= lockTime) {
        const linesDocId = "2026_week_01";
        const linesSnap = await adminDb.collection("gridiron_3x3_lines").doc(linesDocId).get();
        if (!linesSnap.exists) {
          fetchAndStoreTuesdayGridironLines(2026, 1).catch(err => {
            console.warn("[ThePicks] Auto line snapshot sync warning:", err?.message || err);
          });
        }
      }
    }
  } catch (err: any) {
    console.warn("[ThePicks] Error ensuring contest setup:", err?.message || err);
  }
}

apiRouter.get("/admin/gridiron-3x3/contests", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    await ensureThePicksContest();
    const snap = await adminDb.collection("gridiron_3x3_contests").get();
    let contests: any[] = snap.docs.map(doc => ({ contestId: doc.id, ...doc.data() }));

    res.json({ success: true, contests });
  } catch (e: any) {
    console.error("Fetch Admin Gridiron 3x3 contests error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/admin/gridiron-3x3/entries", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const { contestId, weekNumber, season } = req.query;

    const weekNum = parseInt(String(weekNumber || 1), 10);
    const seasonNum = parseInt(String(season || 2026), 10);

    let entries: GridironEntry[] = [];

    if (contestId && typeof contestId === 'string') {
      const entriesSnap = await adminDb.collection("gridiron_3x3_entries")
        .where("contestId", "==", contestId)
        .where("weekNumber", "==", weekNum)
        .get();

      if (!entriesSnap.empty) {
        entries = entriesSnap.docs.map(d => ({ entryId: d.id, ...(d.data() as GridironEntry) }));
      } else {
        const docId = `${seasonNum}_week_${weekNum.toString().padStart(2, '0')}`;
        const snapshotSnap = await adminDb.collection("gridiron_3x3_weekly_snapshots").doc(docId).get();
        if (snapshotSnap.exists) {
          const snapshotEntries: GridironEntry[] = snapshotSnap.data()?.entries || [];
          entries = snapshotEntries.filter(e => e.contestId === contestId);
        }
      }
    } else {
      const entriesSnap = await adminDb.collection("gridiron_3x3_entries").get();
      entries = entriesSnap.docs.map(d => ({ entryId: d.id, ...(d.data() as GridironEntry) }));
    }

    res.json({ success: true, entries });
  } catch (e: any) {
    console.error("Fetch Admin Gridiron 3x3 entries error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/admin/users", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const limitNum = Math.min(parseInt((req.query.limit as string) || '300', 10), 500);
    const snap = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(limitNum).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, users });
  } catch (e: any) {
    console.error("Fetch Admin Users error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/update-role", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, role } = req.body;
    if (!targetUserId || !role || !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid targetUserId or role" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    await userRef.update({
      role: role,
      updatedAt: Date.now()
    });

    if (adminAuth) {
      try {
        await adminAuth.setCustomUserClaims(targetUserId, {
          role: role,
          admin: role === 'ADMIN'
        });
      } catch (claimErr) {
        console.warn("Failed to update custom claims for user:", targetUserId, claimErr);
      }
    }

    res.json({ success: true, role });
  } catch (e: any) {
    console.error("Update role error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/admin/users/chain-detail", validateAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.query;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ success: false, error: "Missing targetUserId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const chainRef = adminDb.collection('chains').doc(`${targetUserId}_current`);
    const chainDoc = await chainRef.get();
    const chainData = chainDoc.exists ? chainDoc.data() : { chain: 0, best: 0, allTimeBest: 0, wins: 0, losses: 0 };

    // Get user's resolved picks
    const picksSnap = await adminDb.collection('picks')
      .where('userId', '==', targetUserId)
      .where('status', 'in', ['WIN', 'LOSS', 'PUSH'])
      .get();

    const allPicks: any[] = picksSnap.docs.map(d => ({ id: d.id, ...((d.data() as any) || {}) }));

    // Deterministic chronological sort using createdAt, falling back to updatedAt
    allPicks.sort((a: any, b: any) => {
      const timeA = a.createdAt || a.updatedAt || 0;
      const timeB = b.createdAt || b.updatedAt || 0;
      return timeA - timeB;
    });

    // Determine current month boundary (UTC start of current month)
    const now = new Date();
    const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0);

    // Calculate All-Time streak
    let allTimeSimChain = 0;
    let allTimeSimBest = 0;
    let allTimeSimWins = 0;
    let allTimeSimLosses = 0;
    for (const p of allPicks) {
      if (p.status === 'WIN') {
        allTimeSimWins++;
        allTimeSimChain = allTimeSimChain < 0 ? 1 : allTimeSimChain + 1;
        if (allTimeSimChain > allTimeSimBest) allTimeSimBest = allTimeSimChain;
      } else if (p.status === 'LOSS') {
        allTimeSimLosses++;
        allTimeSimChain = allTimeSimChain > 0 ? -1 : (allTimeSimChain === 0 ? -1 : allTimeSimChain - 1);
      }
    }

    // Filter picks for Current Month (since monthly reset)
    const monthPicks = allPicks.filter((p: any) => {
      const t = p.createdAt || p.updatedAt || 0;
      return t >= currentMonthStart;
    });

    let monthSimChain = 0;
    let monthSimBest = 0;
    let monthSimWins = 0;
    let monthSimLosses = 0;
    for (const p of monthPicks) {
      if (p.status === 'WIN') {
        monthSimWins++;
        monthSimChain = monthSimChain < 0 ? 1 : monthSimChain + 1;
        if (monthSimChain > monthSimBest) monthSimBest = monthSimChain;
      } else if (p.status === 'LOSS') {
        monthSimLosses++;
        monthSimChain = monthSimChain > 0 ? -1 : (monthSimChain === 0 ? -1 : monthSimChain - 1);
      }
    }

    // Return the last 15 picks so the admin can visually inspect the timeline
    const recentPicks = allPicks.slice(-15).reverse().map((p: any) => ({
      id: p.id,
      matchupId: p.matchupId,
      pickName: p.pick?.name || p.pick?.id || 'Pick',
      status: p.status,
      createdAt: p.createdAt || p.updatedAt || 0
    }));

    res.json({
      success: true,
      currentChain: chainData,
      simulatedChain: {
        chain: monthSimChain,
        best: monthSimBest,
        wins: monthSimWins,
        losses: monthSimLosses
      },
      allTimeSimulatedChain: {
        chain: allTimeSimChain,
        best: allTimeSimBest,
        wins: allTimeSimWins,
        losses: allTimeSimLosses
      },
      picksCount: allPicks.length,
      monthPicksCount: monthPicks.length,
      recentPicks
    });
  } catch (e: any) {
    console.error("Fetch chain detail error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/rebuild-chain", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, scope = 'currentMonth' } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "Missing targetUserId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: "User not found" });

    const chainRef = adminDb.collection('chains').doc(`${targetUserId}_current`);
    const chainDoc = await chainRef.get();
    const existingChain = chainDoc.exists ? chainDoc.data()! : { chain: 0, best: 0, allTimeBest: 0 };

    // Fetch user picks
    const picksSnap = await adminDb.collection('picks')
      .where('userId', '==', targetUserId)
      .where('status', 'in', ['WIN', 'LOSS', 'PUSH'])
      .get();

    let picks: any[] = picksSnap.docs.map(d => ({ id: d.id, ...((d.data() as any) || {}) }));

    // Deterministic chronological sort: A to B
    picks.sort((a: any, b: any) => {
      const timeA = a.createdAt || a.updatedAt || 0;
      const timeB = b.createdAt || b.updatedAt || 0;
      return timeA - timeB;
    });

    const now = new Date();
    const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0);

    // If scope is currentMonth, filter to picks created/graded this month
    if (scope === 'currentMonth') {
      picks = picks.filter((p: any) => {
        const t = p.createdAt || p.updatedAt || 0;
        return t >= currentMonthStart;
      });
    }

    let chain = 0;
    let best = 0;
    let wins = 0;
    let losses = 0;
    for (const p of picks) {
      if (p.status === 'WIN') {
        wins++;
        chain = chain < 0 ? 1 : chain + 1;
        if (chain > best) best = chain;
      } else if (p.status === 'LOSS') {
        losses++;
        chain = chain > 0 ? -1 : (chain === 0 ? -1 : chain - 1);
      }
    }

    const allTimeBest = Math.max(best, existingChain.allTimeBest || 0, existingChain.best || 0, userDoc.data()?.allTimeBest || 0);

    const updatedChain = {
      chain,
      best,
      allTimeBest,
      wins,
      losses,
      userId: targetUserId,
      active: true,
      updatedAt: Date.now()
    };

    await chainRef.set(updatedChain, { merge: true });
    await userRef.update({
      allTimeBest,
      updatedAt: Date.now()
    });

    chainsCache = null;
    chainsCacheTime = 0;
    publicUsersCache = null;
    publicUsersCacheTime = 0;

    res.json({ success: true, updatedChain, scope, picksCount: picks.length });
  } catch (e: any) {
    console.error("Rebuild chain error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/update-chain", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, chain, best, allTimeBest, wins, losses } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "Missing targetUserId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const chainRef = adminDb.collection('chains').doc(`${targetUserId}_current`);
    const chainDoc = await chainRef.get();
    const existingChain = chainDoc.exists ? chainDoc.data()! : { chain: 0, best: 0, allTimeBest: 0 };

    const updatePayload: any = {
      userId: targetUserId,
      active: true,
      updatedAt: Date.now()
    };

    if (chain !== undefined) updatePayload.chain = Number(chain);
    if (best !== undefined) updatePayload.best = Number(best);
    if (allTimeBest !== undefined) updatePayload.allTimeBest = Number(allTimeBest);
    if (wins !== undefined) updatePayload.wins = Number(wins);
    if (losses !== undefined) updatePayload.losses = Number(losses);

    await chainRef.set(updatePayload, { merge: true });

    if (allTimeBest !== undefined) {
      await adminDb.collection('users').doc(targetUserId).update({
        allTimeBest: Number(allTimeBest),
        updatedAt: Date.now()
      });
    }

    chainsCache = null;
    chainsCacheTime = 0;
    publicUsersCache = null;
    publicUsersCacheTime = 0;

    res.json({ success: true, updatedChain: { ...existingChain, ...updatePayload } });
  } catch (e: any) {
    console.error("Update chain error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/create-test-user", validateAdmin, async (req, res) => {
  try {
    const { username, email, password, role, links, count } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const numToCreate = Math.min(Math.max(parseInt(count || 1, 10), 1), 20);
    const createdUsers: any[] = [];

    for (let i = 0; i < numToCreate; i++) {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      const testUsername = (numToCreate === 1 && username) ? username : `testuser_${timestamp.toString().slice(-4)}_${randomSuffix}`;
      const testEmail = (numToCreate === 1 && email) ? email : `testuser_${timestamp}_${randomSuffix}@test.chainlink.local`;
      const testPassword = password || 'TestUser123!';
      const userRole = role && ['USER', 'ADMIN'].includes(role) ? role : 'USER';
      const userLinks = typeof links === 'number' ? links : 100;

      let uid: string;
      if (adminAuth) {
        try {
          const userRecord = await adminAuth.createUser({
            email: testEmail,
            password: testPassword,
            displayName: testUsername,
            emailVerified: true
          });
          uid = userRecord.uid;
        } catch (authErr) {
          uid = `test_uid_${timestamp}_${randomSuffix}`;
        }
      } else {
        uid = `test_uid_${timestamp}_${randomSuffix}`;
      }

      const userData = {
        email: testEmail,
        name: testUsername,
        username: testUsername,
        usernameLower: testUsername.toLowerCase(),
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${testUsername}`,
        links: userLinks,
        role: userRole,
        status: 'ACTIVE',
        stats: { wins: 0, losses: 0, pushes: 0 },
        isTestAccount: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        needsOnboarding: false
      };

      await adminDb.collection('users').doc(uid).set(userData);
      await adminDb.collection('chains').doc(`${uid}_current`).set({
        userId: uid,
        active: true,
        chain: 0,
        wins: 0,
        losses: 0,
        best: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      createdUsers.push({ id: uid, ...userData });
    }

    res.json({ success: true, count: createdUsers.length, users: createdUsers });
  } catch (e: any) {
    console.error("Create test user error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/delete-test-user", validateAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "Missing targetUserId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (adminAuth) {
      try {
        await adminAuth.deleteUser(targetUserId);
      } catch (e) {
        // Auth account might not exist if created locally without auth SDK
      }
    }

    const batch = adminDb.batch();
    batch.delete(userRef);
    batch.delete(adminDb.collection('chains').doc(`${targetUserId}_current`));

    const picksSnap = await adminDb.collection('picks').where('userId', '==', targetUserId).get();
    picksSnap.docs.forEach(doc => batch.delete(doc.ref));

    const pickemPicksSnap = await adminDb.collection('pickemPicks').where('participantId', '==', targetUserId).get();
    pickemPicksSnap.docs.forEach(doc => batch.delete(doc.ref));

    const pickemPartSnap = await adminDb.collection('pickemParticipants').where('participantId', '==', targetUserId).get();
    pickemPartSnap.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();

    res.json({ success: true, deletedUserId: targetUserId });
  } catch (e: any) {
    console.error("Delete test user error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/users/purge-test-users", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const testUsersSnap = await adminDb.collection('users').where('isTestAccount', '==', true).get();
    let count = 0;

    for (const doc of testUsersSnap.docs) {
      const uid = doc.id;

      if (adminAuth) {
        try {
          await adminAuth.deleteUser(uid);
        } catch (e) {
          // Ignores if not found in Auth
        }
      }

      const batch = adminDb.batch();
      batch.delete(doc.ref);
      batch.delete(adminDb.collection('chains').doc(`${uid}_current`));

      const picksSnap = await adminDb.collection('picks').where('userId', '==', uid).get();
      picksSnap.docs.forEach(d => batch.delete(d.ref));

      const pickemPicksSnap = await adminDb.collection('pickemPicks').where('participantId', '==', uid).get();
      pickemPicksSnap.docs.forEach(d => batch.delete(d.ref));

      const pickemPartSnap = await adminDb.collection('pickemParticipants').where('participantId', '==', uid).get();
      pickemPartSnap.docs.forEach(d => batch.delete(d.ref));

      await batch.commit();
      count++;
    }

    res.json({ success: true, purgedCount: count });
  } catch (e: any) {
    console.error("Purge test users error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/pickem/backfill-participants", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const picksSnap = await adminDb.collection('pickemPicks').get();
    let backfilledCount = 0;
    let batch = adminDb.batch();
    let batchCount = 0;

    const existingPairs = new Set<string>();
    const partSnap = await adminDb.collection('pickemParticipants').get();
    partSnap.docs.forEach(d => existingPairs.add(d.id));

    for (const d of picksSnap.docs) {
      const data = d.data();
      const campaignId = data.campaignId;
      const participantId = data.participantId;
      if (!campaignId || !participantId) continue;

      const pairId = `${campaignId}_${participantId}`;
      if (!existingPairs.has(pairId)) {
        existingPairs.add(pairId);
        const ref = adminDb.collection('pickemParticipants').doc(pairId);
        batch.set(ref, {
          campaignId,
          participantId,
          joinedAt: data.createdAt || data.submittedAt || Date.now()
        }, { merge: true });
        backfilledCount++;
        batchCount++;

        if (batchCount >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    res.json({ success: true, backfilledCount });
  } catch (e: any) {
    console.error('Pickem backfill participants error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export async function seedNbaFridayCampaign() {
  if (!adminDb) return { success: false, error: 'adminDb not initialized' };

  const campaignId = 'nba_friday_pickem';
  const docRef = adminDb.collection('pickemCampaigns').doc(campaignId);
  const snap = await docRef.get();

  const campaignData = {
    name: "NBA Friday Night Pick 'Em",
    league: 'NBA',
    leagues: ['NBA'],
    pickLimit: 5,
    totalWeeks: 25,
    hasWeekZero: false,
    useTiebreaker: false,
    format: 'STANDARD',
    type: 'STANDARD',
    defaultMatchType: 'STANDARD',
    scoringType: 'WIN_LOSS',
    isOpen: true,
    isArchived: false,
    archived: false,
    isPrivate: false,
    isFridayOnly: true,
    dayFilter: 'FRIDAY',
    entryFee: 0,
    currentWeek: 1,
    gamesBeginDate: Date.now(),
    startDate: Date.now(),
    endDate: Date.now() + 1000 * 60 * 60 * 24 * 30 * 8,
    theme: {
      primaryColor: '#f97316',
      title: "NBA Friday Night Pick 'Em",
      subtitle: "Pick 5 NBA matchups from the Friday night slate every week and compete on the leaderboard!",
      logoUrl: 'https://a.espncdn.com/i/leaguelogos/nba/500/nba.png'
    },
    createdAt: snap.exists ? (snap.data()?.createdAt || Date.now()) : Date.now(),
    updatedAt: Date.now()
  };

  await docRef.set(campaignData, { merge: true });
  return { success: true, campaignId, campaign: campaignData };
}

apiRouter.post("/admin/pickem/seed-nba-friday", validateAdmin, async (req, res) => {
  try {
    const result = await seedNbaFridayCampaign();
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (e: any) {
    console.error("Error seeding NBA Friday campaign:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export async function syncCampaignWeekMatchups(campaignId: string, weekNumber: number) {
  if (!adminDb) return { success: false, error: 'adminDb not initialized' };

  const campaignDoc = await adminDb.collection('pickemCampaigns').doc(campaignId).get();
  if (!campaignDoc.exists) {
    return { success: false, error: 'Campaign not found' };
  }

  const campaign = campaignDoc.data()!;
  const leaguesToSync = campaign.leagues && campaign.leagues.length > 0
    ? campaign.leagues
    : (campaign.league ? [campaign.league] : ['NBA']);

  const isFridayOnly = campaign.isFridayOnly || campaign.dayFilter === 'FRIDAY' || (campaign.name && campaign.name.toLowerCase().includes('friday'));

  const ws = campaign.weekSettings?.[weekNumber] || {};
  let effectiveBeginDate = ws.gamesBeginDate;
  let effectiveEndDate = ws.endDate;

  if (!effectiveBeginDate) {
    if (campaign.gamesBeginDate || campaign.startDate) {
      const baseWeek = campaign.hasWeekZero ? 0 : 1;
      const weekNum = typeof weekNumber === 'number' ? weekNumber : (parseInt(String(weekNumber), 10) || 1);
      const weekIndex = Math.max(0, weekNum - baseWeek);
      effectiveBeginDate = (campaign.gamesBeginDate || campaign.startDate) + (weekIndex * 7 * 86400000);
    } else {
      effectiveBeginDate = Date.now();
    }
  }

  if (!effectiveEndDate) {
    effectiveEndDate = effectiveBeginDate + (7 * 86400000);
  }

  let specificDates: string[] | undefined = undefined;
  if (effectiveBeginDate && effectiveEndDate) {
    const dateSet = new Set<string>();
    let curr = new Date(effectiveBeginDate);
    const end = new Date(effectiveEndDate);
    let days = 0;
    while (curr <= end && days <= 14) {
      const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [month, day, year] = str.split("/");
      const nyDay = new Date(curr.toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
      if (!isFridayOnly || nyDay === 5) {
        dateSet.add(`${year}${month}${day}`);
      }
      curr = new Date(curr.getTime() + 86400000);
      days++;
    }
    specificDates = Array.from(dateSet);
  }

  let syncedCount = 0;
  let batch = adminDb.batch();
  let batchCount = 0;

  for (const lg of leaguesToSync) {
    const res = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
    let gamesList = res.data || [];

    // Also query custom / created matchups (including player props) stored directly in Firestore for this league
    try {
      const fsSnap = await adminDb.collection('matchups').where('league', '==', lg).get();
      const fsMatchups: any[] = fsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => !m.abandoned);

      if (gamesList.length === 0) {
        gamesList = fsMatchups;
      } else {
        const existingIds = new Set(gamesList.map((g: any) => String(g.gameId || g.id || '')));
        for (const fm of fsMatchups) {
          const fid = String(fm.gameId || fm.id || '');
          if (fid && !existingIds.has(fid)) {
            if (fm.metadata?.isPropMatchup || fm.type === 'STATS' || fm.type === 'OVER_UNDER' || fm.type === 'PROP' || fid.includes('prop')) {
              gamesList.push(fm);
            }
          }
        }
      }
    } catch (fsErr) {
      console.warn(`[PickEmSync] Failed to query Firestore matchups for league ${lg}:`, fsErr);
    }

    if (gamesList.length === 0) continue;

    for (const m of gamesList) {
      const gameTime = typeof m.startTime === 'number' ? m.startTime : new Date(m.startTime).getTime();
      const gameNyStr = new Date(gameTime).toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [mMonth, mDay, mYear] = gameNyStr.split("/");
      const gameNyKey = `${mYear}${mMonth}${mDay}`;

      const matchesSpecificDate = specificDates && specificDates.includes(gameNyKey);
      if (!matchesSpecificDate) {
        if (effectiveBeginDate && gameTime < (effectiveBeginDate - 43200000)) continue;
        if (effectiveEndDate && gameTime > (effectiveEndDate + 43200000)) continue;
      }

      if (isFridayOnly) {
        const gameNyDate = new Date(new Date(gameTime).toLocaleString("en-US", { timeZone: "America/New_York" }));
        if (gameNyDate.getDay() !== 5) {
          continue;
        }
      }

      const effectiveGameId = String(m.gameId || m.id || '');
      if (!effectiveGameId) continue;
      const pickemMatchupId = `${campaignId}_${weekNumber}_${effectiveGameId}`;
      const docRef = adminDb.collection('pickemMatchups').doc(pickemMatchupId);

      const isYesDay = !!(campaign.isCharity || campaign.name === 'YES Day Walk for Autism 2026' || campaignId === 'charity' || campaignId === 'yes_day_2026' || campaignId === 'aUqhDhT3vKWfkPgSAVzf' || (typeof campaign.name === 'string' && campaign.name.toLowerCase().includes('yes day')));
      const isProp = m.metadata?.isPropMatchup || m.type === 'OVER_UNDER' || m.type === 'STATS' || m.type === 'PROP' || effectiveGameId.includes('prop');
      const finalType = isYesDay
        ? "STANDARD"
        : (isProp && (m.type === 'OVER_UNDER' || m.type === 'STATS' || m.type === 'PROP')
            ? m.type
            : (campaign.defaultMatchType === "BOTH" ? ((m.metadata?.spread !== undefined && m.metadata?.spread !== null) ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD")));

      const finalTitle = isYesDay
        ? m.title.replace(/ - ATS$/, '')
        : (finalType === "SPREAD"
            ? (m.title.endsWith(' - ATS') ? m.title : `${m.title} - ATS`)
            : m.title.replace(/ - ATS$/, ''));

      batch.set(docRef, {
        campaignId,
        week: weekNumber,
        gameId: effectiveGameId,
        title: finalTitle,
        league: m.league || lg,
        featured: !!m.featured,
        featuredType: m.featuredType || '',
        startTime: m.startTime,
        status: m.status,
        statusDesc: m.statusDesc,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        type: finalType,
        metadata: m.metadata || null,
        createdAt: Date.now()
      }, { merge: true });

      syncedCount++;
      batchCount++;

      if (batchCount >= 450) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { success: true, syncedCount };
}

apiRouter.post("/admin/pickem/sync-week", validateAdmin, async (req, res) => {
  try {
    const { campaignId, week } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Missing campaignId" });
    }
    const result = await syncCampaignWeekMatchups(campaignId, Number(week) || 1);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (e: any) {
    console.error("Error syncing campaign week:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/link4/add-matchups", validateAdmin, async (req, res) => {
  try {
    const { segmentId, matchups } = req.body;
    if (!segmentId || !Array.isArray(matchups) || matchups.length === 0) {
      return res.status(400).json({ success: false, error: "Missing segmentId or matchups array" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    let batch = adminDb.batch();
    let batchCount = 0;
    let count = 0;

    for (const m of matchups) {
      const rawId = String(m.gameId || m.id || '');
      const gameIdStr = rawId.replace(new RegExp(`^${segmentId}_`), '');
      if (!gameIdStr) continue;

      const link4MatchupId = `${segmentId}_${gameIdStr}`;
      const docRef = adminDb.collection('link4Matchups').doc(link4MatchupId);

      let metadataToSave = m.metadata ? JSON.parse(JSON.stringify(m.metadata)) : {};
      if (metadataToSave.mlHome === undefined || metadataToSave.mlHome === null) metadataToSave.mlHome = -110;
      if (metadataToSave.mlAway === undefined || metadataToSave.mlAway === null) metadataToSave.mlAway = -110;

      const homeTeamToSave = m.homeTeam ? JSON.parse(JSON.stringify(m.homeTeam)) : null;
      const awayTeamToSave = m.awayTeam ? JSON.parse(JSON.stringify(m.awayTeam)) : null;

      const rawStart = m.startTime;
      const validStartTime = typeof rawStart === 'number' ? rawStart : (rawStart ? new Date(rawStart).getTime() : Date.now());

      batch.set(docRef, {
        segmentId,
        gameId: gameIdStr,
        title: m.title || `${awayTeamToSave?.name || 'Away'} @ ${homeTeamToSave?.name || 'Home'}`,
        startTime: isNaN(validStartTime) ? Date.now() : validStartTime,
        status: m.status || 'STATUS_SCHEDULED',
        statusDesc: m.statusDesc || '',
        homeTeam: homeTeamToSave,
        awayTeam: awayTeamToSave,
        league: m.league || 'UNKNOWN',
        type: 'STANDARD',
        link4Excluded: false,
        metadata: metadataToSave,
        updatedAt: Date.now()
      }, { merge: true });

      count++;
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    invalidateMatchupCaches();

    res.json({ success: true, count });
  } catch (e: any) {
    console.error('Link4 add matchups error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/link4/sync-matchups", validateAdmin, async (req, res) => {
  try {
    const { segmentId } = req.body;
    if (!segmentId) {
      return res.status(400).json({ success: false, error: "Missing segmentId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const segmentDoc = await adminDb.collection('link4Segments').doc(segmentId).get();
    if (!segmentDoc.exists) {
      return res.status(404).json({ success: false, error: "Segment not found" });
    }

    const segment = segmentDoc.data()!;
    let leaguesToSync = segment.allowedSports && segment.allowedSports.length > 0
      ? segment.allowedSports
      : [];

    if (leaguesToSync.length === 0) {
      const nameLower = (segment.name || '').toLowerCase();
      if (nameLower.includes('college football') || nameLower.includes('cfb') || nameLower.includes('ncaa football')) {
        leaguesToSync = ['CFB'];
      } else if (nameLower.includes('nfl')) {
        leaguesToSync = ['NFL'];
      } else if (nameLower.includes('nba')) {
        leaguesToSync = ['NBA'];
      } else if (nameLower.includes('mlb')) {
        leaguesToSync = ['MLB'];
      } else if (nameLower.includes('nhl')) {
        leaguesToSync = ['NHL'];
      } else {
        leaguesToSync = ['CFB', 'NFL', 'MLB', 'NBA', 'NHL'];
      }
    }

    let count = 0;
    let batch = adminDb.batch();
    let batchCount = 0;

    for (const lg of leaguesToSync) {
      let effectiveBeginDate = segment.startTime ? new Date(segment.startTime).getTime() : undefined;
      let effectiveEndDate = segment.endTime ? new Date(segment.endTime).getTime() : undefined;

      if (effectiveBeginDate && !effectiveEndDate) {
        effectiveEndDate = effectiveBeginDate + (14 * 86400000);
      } else if (!effectiveBeginDate && effectiveEndDate) {
        effectiveBeginDate = effectiveEndDate - (14 * 86400000);
      }

      let specificDates: string[] | undefined = undefined;
      if (effectiveBeginDate && effectiveEndDate) {
        // Expand date range to +/- 7 days around segment bounds so games across the week are pulled
        const startDay = new Date(effectiveBeginDate - 1 * 86400000);
        const endDay = new Date(effectiveEndDate + 1 * 86400000);
        let curr = new Date(startDay);
        let days = 0;
        const dateSet = new Set<string>();
        while (curr <= endDay && days <= 60) {
          const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
          const [month, day, year] = str.split("/");
          dateSet.add(`${year}${month}${day}`);
          curr = new Date(curr.getTime() + 86400000);
          days++;
        }
        specificDates = Array.from(dateSet);
      }

      // Buffer start/end filter by 7 days so games occurring during the segment week are not cut off
      const filterBegin = effectiveBeginDate ? effectiveBeginDate : undefined;
      const filterEnd = effectiveEndDate ? effectiveEndDate : undefined;

      // 1. Scrape live ESPN schedules
      const matchupsToProcess: any[] = [];
      try {
        const resScrape = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
        if (resScrape.data && resScrape.data.length > 0) {
          matchupsToProcess.push(...resScrape.data);
        }
      } catch (e) {
        console.warn(`Scrape schedules failed for league ${lg}:`, e);
      }

      // 2. Also check existing main 'matchups' collection for this league
      try {
        const existingSnap = await adminDb.collection('matchups').where('league', '==', lg).get();
        existingSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data && data.gameId) {
            matchupsToProcess.push(data);
          }
        });
      } catch (e) {
        console.warn(`Failed to fetch existing main matchups for league ${lg}:`, e);
      }

      const processedGameIds = new Map<string, any>();

      for (const m of matchupsToProcess) {
        const gameIdStr = String(m.gameId);
        if (!gameIdStr || gameIdStr === 'undefined') continue;

        if (!processedGameIds.has(gameIdStr)) {
          processedGameIds.set(gameIdStr, m);
        } else {
          // Merge properties, preferring items that have populated metadata moneyline odds
          const existing = processedGameIds.get(gameIdStr);
          const hasExistingML = existing.metadata?.mlHome !== undefined && existing.metadata?.mlHome !== null;
          const hasNewML = m.metadata?.mlHome !== undefined && m.metadata?.mlHome !== null;
          if (!hasExistingML && hasNewML) {
            processedGameIds.set(gameIdStr, { ...existing, ...m, metadata: { ...existing.metadata, ...m.metadata } });
          } else {
            processedGameIds.set(gameIdStr, { ...m, ...existing, metadata: { ...m.metadata, ...existing.metadata } });
          }
        }
      }

      for (const [gameIdStr, m] of processedGameIds.entries()) {
        const rawStart = m.startTime;
        const validStartTime = typeof rawStart === 'number' ? rawStart : (rawStart ? new Date(rawStart).getTime() : Date.now());
        const finalStartTime = isNaN(validStartTime) ? Date.now() : validStartTime;

        if (filterBegin && finalStartTime < filterBegin) continue;
        if (filterEnd && finalStartTime > filterEnd) continue;

        const link4MatchupId = `${segmentId}_${gameIdStr}`;
        const docRef = adminDb.collection('link4Matchups').doc(link4MatchupId);

        let metadataToSave = m.metadata ? JSON.parse(JSON.stringify(m.metadata)) : {};
        if (!metadataToSave) metadataToSave = {};

        // Fall back to standard moneyline (-110) if moneyline odds are missing
        if (metadataToSave.mlHome === undefined || metadataToSave.mlHome === null) {
          metadataToSave.mlHome = -110;
        }
        if (metadataToSave.mlAway === undefined || metadataToSave.mlAway === null) {
          metadataToSave.mlAway = -110;
        }

        const homeTeamToSave = m.homeTeam ? JSON.parse(JSON.stringify(m.homeTeam)) : null;
        const awayTeamToSave = m.awayTeam ? JSON.parse(JSON.stringify(m.awayTeam)) : null;

        batch.set(docRef, {
          segmentId: segmentId,
          gameId: gameIdStr,
          title: m.title || `${awayTeamToSave?.name || 'Away'} @ ${homeTeamToSave?.name || 'Home'}`,
          startTime: finalStartTime,
          status: m.status || 'STATUS_SCHEDULED',
          statusDesc: m.statusDesc || '',
          homeTeam: homeTeamToSave,
          awayTeam: awayTeamToSave,
          league: m.league || lg,
          type: 'STANDARD',
          link4Excluded: false,
          metadata: metadataToSave,
          updatedAt: Date.now()
        }, { merge: true });

        count++;
        batchCount++;
        if (batchCount >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    invalidateMatchupCaches();

    res.json({ success: true, count });
  } catch (e: any) {
    console.error('Link4 sync matchups error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/link4/delete-matchup", validateAdmin, async (req, res) => {
  try {
    const { matchupId } = req.body;
    if (!matchupId) {
      return res.status(400).json({ success: false, error: "Missing matchupId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    await adminDb.collection('link4Matchups').doc(matchupId).delete();
    invalidateMatchupCaches();
    res.json({ success: true });
  } catch (e: any) {
    console.error('Link4 delete matchup error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/pickem/payout", validateAdmin, async (req, res) => {
  try {
    const { campaignId } = req.body;
    await payoutPickemCampaign(campaignId);
    res.json({ success: true });
  } catch (e: any) {
    console.error('Pickem payout error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/pickem/join", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    let { campaignId, joinCode } = req.body;

    const cleanJoinCode = (joinCode || '').trim();

    if (!campaignId && cleanJoinCode) {
      const matchSnap = await adminDb.collection('pickemCampaigns').get();
      const matched = matchSnap.docs.find(d => {
        const data = d.data();
        return !data.isArchived && (
          (data.joinCode && data.joinCode.trim().toLowerCase() === cleanJoinCode.toLowerCase()) ||
          d.id.toLowerCase() === cleanJoinCode.toLowerCase()
        );
      });
      if (matched) {
        campaignId = matched.id;
      }
    }

    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Missing campaignId or invalid join code." });
    }

    let joinedCampaignId = campaignId;

    await adminDb.runTransaction(async (transaction: any) => {
      const pairId = `${campaignId}_${uid}`;
      const participantRef = adminDb.collection('pickemParticipants').doc(pairId);
      const participantDoc = await transaction.get(participantRef);

      if (participantDoc.exists) {
        return; // Already joined - skip join code validation & fee checks
      }

      // Check if participant already has picks submitted for this campaign
      const picksQuery = adminDb.collection('pickemPicks')
        .where('campaignId', '==', campaignId)
        .where('participantId', '==', uid)
        .limit(1);
      const picksSnap = await transaction.get(picksQuery);

      if (!picksSnap.empty) {
        // Backfill missing participant doc and return
        transaction.set(participantRef, {
          campaignId,
          participantId: uid,
          joinedAt: Date.now()
        });
        return;
      }

      const campaignRef = adminDb.collection('pickemCampaigns').doc(campaignId);
      const campaignDoc = await transaction.get(campaignRef);

      if (!campaignDoc.exists) throw new Error("Campaign not found");
      const campaignData = campaignDoc.data();

      if (campaignData.isOpen === false) {
        throw new Error("This campaign is closed to new entries.");
      }

      if (campaignData.isPrivate) {
        const expectedCode = (campaignData.joinCode || '').trim().toLowerCase();
        if (!cleanJoinCode || cleanJoinCode.toLowerCase() !== expectedCode) {
          throw new Error("Invalid join code for this private campaign.");
        }
      }

      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const userData = userDoc.data();
      const entryFee = campaignData.entryFee || 0;
      const currentLinks = userData.links || 0;

      if (entryFee > 0 && currentLinks < entryFee) {
        throw new Error(`Not enough links. Joining this campaign requires ${entryFee} links.`);
      }

      if (entryFee > 0) {
        transaction.update(userRef, { links: currentLinks - entryFee });
        const logRef = adminDb.collection('linkTransactions').doc();
        transaction.set(logRef, {
          userId: uid,
          username: userData.username || userData.name || 'Unknown User',
          type: 'PICKEM_ENTRY',
          amount: -entryFee,
          description: `Entry fee for Pick 'Em campaign: ${campaignData.name || campaignId}`,
          createdAt: Date.now()
        });
      }

      transaction.set(participantRef, {
        campaignId,
        participantId: uid,
        joinedAt: Date.now()
      });
    });

    res.json({ success: true, campaignId: joinedCampaignId });
  } catch (e: any) {
    console.error("Pickem join error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});


apiRouter.post("/admin/update-links", validateAdmin, async (req, res) => {
  try {
    const { targetUserId, amount } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data();
    const currentLinks = userData.links || 0;
    const newLinks = currentLinks + amount;

    await userRef.update({ links: newLinks });

    const logRef = adminDb.collection('linkTransactions').doc();
    await logRef.set({
      userId: targetUserId,
      username: userData.username || userData.name || 'Unknown User',
      type: 'ADMIN_MANUAL',
      amount: amount,
      description: 'Admin explicitly added/removed links',
      createdAt: Date.now()
    });

    res.json({ success: true, newLinks });
  } catch (e: any) {
    console.error("Update links error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/reconcile-wallets", validateAdmin, async (req, res) => {
  try {
    const isApply = req.body?.apply === true;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const timestamp = Date.now();
    const usersSnap = await adminDb.collection('users').get();

    let countTotal = 0;
    let countUpdated = 0;
    let totalChainlinkLinksBefore = 0;
    let totalReconciledLinksAfter = 0;
    const results: any[] = [];

    // Snapshot current users to backup collection if applying
    if (isApply) {
      const backupCollection = adminDb.collection(`migration_backups_${timestamp}`);
      let backupBatch = adminDb.batch();
      let backupCount = 0;
      for (const d of usersSnap.docs) {
        backupBatch.set(backupCollection.doc(d.id), { ...d.data(), backupTimestamp: timestamp });
        backupCount++;
        if (backupCount >= 400) {
          await backupBatch.commit();
          backupBatch = adminDb.batch();
          backupCount = 0;
        }
      }
      if (backupCount > 0) {
        await backupBatch.commit();
      }
    }

    for (const doc of usersSnap.docs) {
      countTotal++;
      const u = doc.data();
      const userId = doc.id;
      const email = (u.email || '').trim().toLowerCase();
      const username = u.username || u.name || 'Anonymous';
      const chainlinkLinks = Number(u.links ?? 0);
      totalChainlinkLinksBefore += chainlinkLinks;

      let coreLinks = 100;
      let targetWalletId = `wlt_${userId}`;

      if (email) {
        try {
          const coreRes = await fetch(`https://api.club602.com/v1/wallet/${targetWalletId}?email=${encodeURIComponent(email)}`);
          if (coreRes.ok) {
            const wData: any = await coreRes.json();
            coreLinks = Number(wData.availableBalance ?? wData.balance ?? 100);
            if (wData.walletId) targetWalletId = wData.walletId;
          }
        } catch (err) {}
      }

      // Reconciliation Rules
      const base = chainlinkLinks < 100 ? 100 : chainlinkLinks;
      let finalLinks = base;
      let calculationSource = 'ChainLink Base Floor (100)';

      if (chainlinkLinks >= 100) {
        if (coreLinks > 100 && chainlinkLinks > coreLinks) {
          const surplus = coreLinks - 100;
          finalLinks = chainlinkLinks + surplus;
          calculationSource = `ChainLink (${chainlinkLinks}) + Core Surplus (${surplus})`;
        } else if (coreLinks >= chainlinkLinks) {
          finalLinks = coreLinks;
          calculationSource = `Core Wallet Balance (${coreLinks})`;
        } else {
          finalLinks = chainlinkLinks;
          calculationSource = `ChainLink Balance (${chainlinkLinks})`;
        }
      } else {
        if (coreLinks > 100) {
          finalLinks = coreLinks;
          calculationSource = `Floor elevated by Core Wallet (${coreLinks})`;
        } else {
          finalLinks = 100;
          calculationSource = 'Floor raised to 100';
        }
      }

      totalReconciledLinksAfter += finalLinks;
      const deltaChainlink = finalLinks - chainlinkLinks;
      const deltaCore = finalLinks - coreLinks;
      if (deltaChainlink !== 0 || deltaCore !== 0) {
        countUpdated++;
      }

      results.push({
        userId,
        email: email || 'NO_EMAIL',
        username,
        chainlinkLinks,
        coreLinks,
        finalLinks,
        deltaChainlink,
        deltaCore,
        targetWalletId,
        source: calculationSource
      });
    }

    if (isApply) {
      let applyBatch = adminDb.batch();
      let opCount = 0;
      for (const r of results) {
        const uRef = adminDb.collection('users').doc(r.userId);
        applyBatch.update(uRef, {
          links: r.finalLinks,
          walletId: r.targetWalletId,
          reconciledAt: timestamp,
          updatedAt: timestamp
        });
        opCount++;

        if (r.deltaChainlink !== 0) {
          const txRef = adminDb.collection('linkTransactions').doc();
          applyBatch.set(txRef, {
            userId: r.userId,
            username: r.username,
            type: 'WALLET_CONSOLIDATION',
            amount: r.deltaChainlink,
            description: `Consolidated to Central Club 602 Wallet (${r.source})`,
            createdAt: timestamp
          });
          opCount++;
        }

        if (opCount >= 400) {
          await applyBatch.commit();
          applyBatch = adminDb.batch();
          opCount = 0;
        }
      }
      if (opCount > 0) {
        await applyBatch.commit();
      }
    }

    res.json({
      success: true,
      mode: isApply ? 'APPLY' : 'DRY_RUN',
      timestamp,
      summary: {
        totalUsers: countTotal,
        usersWithChanges: countUpdated,
        totalLinksBefore: totalChainlinkLinksBefore,
        totalLinksAfter: totalReconciledLinksAfter,
        netDelta: totalReconciledLinksAfter - totalChainlinkLinksBefore
      },
      results
    });
  } catch (e: any) {
    console.error("Reconcile wallets error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/grade-pickem-matchup", validateAdmin, async (req, res) => {
  try {
    const { matchupId, manualWinnerId } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const doc = await adminDb.collection('pickemMatchups').doc(matchupId).get();
    if (!doc.exists) {
       return res.status(404).json({ success: false, error: "Pick 'Em Matchup not found" });
    }

    const matchup: any = { ...doc.data(), id: doc.id };
    if (manualWinnerId !== undefined) {
      if (manualWinnerId === null || manualWinnerId === 'CLEAR') {
        delete matchup.manualWinnerId;
        const { FieldValue } = await import('firebase-admin/firestore');
        await adminDb.collection('pickemMatchups').doc(matchupId).update({
          manualWinnerId: FieldValue.delete()
        });
      } else {
        matchup.manualWinnerId = manualWinnerId;
        await adminDb.collection('pickemMatchups').doc(matchupId).update({
          manualWinnerId: manualWinnerId
        });
      }
    }
    await gradePickemMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade
    res.json({ success: true });
  } catch (e: any) {
    console.error("Grade Pick 'Em matchup error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/rebuild-pickem-leaderboard", validateAdmin, async (req, res) => {
  try {
    const { campaignId } = req.body;
    const cid = campaignId || 'yes_day_2026';
    const result = await generateAndSavePickemLeaderboard(cid);
    res.json({ success: true, leaderboard: result });
  } catch (e: any) {
    console.error("Rebuild Pick 'Em leaderboard error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/shop/claim-daily", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const profile = userDoc.data()!;
      if (!profile.premium) {
        throw new Error("Must be a ChainLink Pro member to claim daily links.");
      }

      const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      if (profile.lastDailyClaim === todayStr) {
        throw new Error("You have already claimed your daily links today.");
      }

      const updateData: any = {
        updatedAt: Date.now(),
        links: (profile.links || 0) + 10,
        lastDailyClaim: todayStr
      };

      transaction.update(userRef, updateData);
      const logRef = adminDb.collection('linkTransactions').doc();
      transaction.set(logRef, {
        userId: uid,
        username: profile.username || profile.name || 'Unknown User',
        type: 'DAILY_CLAIM',
        amount: 10,
        description: 'Daily Links Claim',
        createdAt: Date.now()
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Claim daily links error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});




apiRouter.post('/stripe/create-portal-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const profile = userDoc.data();

    // We need to look up the Stripe Customer ID for this user.
    // If we didn't save it on the user profile, we can query Stripe.
    // However, we didn't save stripeCustomerId!
    // We can search Stripe customers by email.
    if (!profile.email) return res.status(400).json({ success: false, error: 'User email not found' });

    const customers = await stripe.customers.search({
      query: `email:"${profile.email}"`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ success: false, error: 'Stripe customer not found' });
    }

    const customerId = customers.data[0].id;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || (req.protocol + '://' + req.get('host'))}/shop`,
    });

    res.json({ success: true, url: portalSession.url });
  } catch (e: any) {
    console.error("Create portal session error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Missing stripe signature or endpoint secret');
    }

    // Express must use express.raw to get raw body
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    let uid = session.metadata?.uid;
    let itemType = session.metadata?.itemType;
    let amountStr = session.metadata?.amount;

    if (!uid && session.subscription) {
       try {
         const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
         uid = subscription.metadata?.uid;
         itemType = subscription.metadata?.itemType;
         amountStr = subscription.metadata?.amount;
       } catch (e) {
         console.error("Failed to retrieve subscription metadata:", e);
       }
    }

    if (uid && adminDb) {
      try {
        const userRef = adminDb.collection('users').doc(uid);

        await adminDb.runTransaction(async (transaction: any) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) return;

          const profile = userDoc.data()!;
          const updateData: any = { updatedAt: Date.now() };

          if (itemType === 'links') {
            if (amountStr) {
               const amount = parseInt(String(amountStr), 10);
               updateData.links = (profile.links || 0) + amount;

               // Keep a record of all link purchases
               const ordersRef = adminDb.collection('orders').doc();
               transaction.set(ordersRef, {
                 userId: uid,
                 userEmail: profile.email || '',
                 itemId: `links-${amount}`,
                 itemName: `${amount} Links Pack`,
                 status: 'COMPLETED',
                 createdAt: Date.now(),
                 updatedAt: Date.now()
               });
            }
             if (amountStr) {
               const amount = parseInt(String(amountStr), 10);
               const logRef = adminDb.collection('linkTransactions').doc();
               transaction.set(logRef, {
                 userId: uid,
                 username: profile.username || profile.name || 'Unknown User',
                 type: 'SHOP_PURCHASE_PACK',
                 amount: amount,
                 description: `Purchased ${amount} Links Pack`,
                 createdAt: Date.now()
               });
             }
          } else if (itemType === 'premium') {
             updateData.premium = true;
          }

          transaction.update(userRef, updateData);
        });
      } catch (e: any) {
         console.error(`Error updating user ${uid} after payment:`, e.message);
      }
    }
  }


  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const uid = subscription.metadata?.uid;
    const itemType = subscription.metadata?.itemType;
    
    if (uid && itemType === 'premium' && adminDb) {
      try {
        const userRef = adminDb.collection('users').doc(uid);
        await adminDb.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) return;
          
          if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            transaction.update(userRef, { premium: false, updatedAt: Date.now() });
          } else if (subscription.status === 'active' || subscription.status === 'trialing') {
             transaction.update(userRef, { premium: true, updatedAt: Date.now() });
          }
        });
      } catch (e) {
        console.error("Error updating user premium status:", e.message);
      }
    }
  }
  res.send();

});


apiRouter.post("/link4/submit", async (req, res) => {
  try {
    const { segmentId, picks, username, avatarUrl } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const segmentRef = adminDb.collection('link4Segments').doc(segmentId);
      const segmentDoc = await transaction.get(segmentRef);
      if (!segmentDoc.exists) throw new Error("Segment not found");
      const segmentData = segmentDoc.data();
      const cost = segmentData.cost ?? 10;

      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const pickRef = adminDb.collection('link4Picks').doc(`${segmentId}_${uid}`);
      const pickDoc = await transaction.get(pickRef);

      const userData = userDoc.data();
      const currentLinks = userData.links || 0;

      if (pickDoc.exists) {
        // User is appending picks. No fee deduction.
        const existingData = pickDoc.data();
        if (existingData.hasLoss) throw new Error("You have been eliminated and cannot make more picks.");

        const currentPicks = Array.isArray(existingData.picks) ? existingData.picks : (existingData.picks ? Object.values(existingData.picks) : []);

        // Ensure they aren't overwriting existing picks, only appending
        const incomingPicksCount = picks.filter((p: any) => p !== null).length;
        if (incomingPicksCount <= currentPicks.length) {
            throw new Error("Invalid submission. You can only append new picks.");
        }

        // Ensure previous picks match exactly
        for (let i = 0; i < currentPicks.length; i++) {
           if (picks[i] === null || picks[i].id !== currentPicks[i].id) {
               throw new Error("Invalid submission. Cannot modify locked picks.");
           }
        }

        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        let lastStartTime = 0;
        for (let i = 0; i < sanitizedPicks.length; i++) {
            const pick = sanitizedPicks[i];
            const mId = pick.id.replace('pick-', '');
            const matchupRef = adminDb.collection('link4Matchups').doc(`${segmentId}_${mId}`);
            const mDoc = await transaction.get(matchupRef);
            if (!mDoc.exists) throw new Error("Invalid matchup selected.");
            const mData = mDoc.data();

            if (i >= currentPicks.length) {
              if (mData.status !== 'STATUS_SCHEDULED') throw new Error("Cannot pick a game that has already started.");
              if (mData.startTime && getMatchupStartTime(mData.startTime) <= Date.now()) throw new Error("Matchup is locked.");
            }

            const startTimeMs = getMatchupStartTime(mData.startTime || pick.startTime);
            if (i > 0 && lastStartTime > 0 && startTimeMs > 0 && startTimeMs <= lastStartTime) {
              throw new Error("No games from the same start time/slate are allowed. Picks must be in strict chronological order.");
            }
            if (startTimeMs > 0) {
              lastStartTime = startTimeMs;
            }
        }

        transaction.update(pickRef, {
          picks: sanitizedPicks,
          updatedAt: Date.now()
        });

      } else {
        // First pick, deduct fee
        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length === 0) {
            throw new Error("Must provide at least one pick to enter.");
        }
        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        let lastStartTime = 0;
        for (let i = 0; i < sanitizedPicks.length; i++) {
            const pick = sanitizedPicks[i];
            const mId = pick.id.replace('pick-', '');
            const matchupRef = adminDb.collection('link4Matchups').doc(`${segmentId}_${mId}`);
            const mDoc = await transaction.get(matchupRef);
            if (!mDoc.exists) throw new Error("Invalid matchup selected.");
            const mData = mDoc.data();

            if (mData.status !== 'STATUS_SCHEDULED') throw new Error("Cannot pick a game that has already started.");
            if (mData.startTime && getMatchupStartTime(mData.startTime) <= Date.now()) throw new Error("Matchup is locked.");

            const startTimeMs = getMatchupStartTime(mData.startTime || pick.startTime);
            if (i > 0 && lastStartTime > 0 && startTimeMs > 0 && startTimeMs <= lastStartTime) {
              throw new Error("No games from the same start time/slate are allowed. Picks must be in strict chronological order.");
            }
            if (startTimeMs > 0) {
              lastStartTime = startTimeMs;
            }
        }

        if (currentLinks < cost) {
          throw new Error(`Not enough links. Link4 requires ${cost} links to enter.`);
        }

        transaction.update(userRef, { links: currentLinks - cost });
        const logRef = adminDb.collection('linkTransactions').doc();
        transaction.set(logRef, {
          userId: uid,
          username: userData.username || userData.name || 'Unknown User',
          type: 'LINK4_ENTRY',
          amount: -cost,
          description: 'Link4 Entry Fee',
          createdAt: Date.now()
        });

        transaction.set(pickRef, {
          segmentId,
          userId: uid,
          username: userData.username || userData.name || username || 'Anonymous',
          avatarUrl: userData.image || avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
          picks: sanitizedPicks,
          hasLoss: false,
          submittedAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting Link4 picks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


apiRouter.post("/picks/forfeit-pick", async (req, res) => {
  try {
    const { matchupId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adminAuth = (await import('./lib/firebase-admin.js')).adminAuth;
    const adminDb = (await import('./lib/firebase-admin.js')).adminDb;

    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");
      const userData = userDoc.data();

      if (!userData.premium) {
        throw new Error("Must be a ChainLink Pro member to forfeit a pick.");
      }

      const matchupRef = adminDb.collection('matchups').doc(matchupId);
      const matchupDoc = await transaction.get(matchupRef);
      if (!matchupDoc.exists) throw new Error("Matchup not found");

      const matchup = matchupDoc.data();

      if (matchup.status === 'STATUS_SCHEDULED' || matchup.status === 'STATUS_FINAL' || matchup.status === 'STATUS_POSTPONED' || matchup.status === 'STATUS_CANCELED' || matchup.statusDesc?.toLowerCase().includes('final')) {
        throw new Error("Matchup cannot be forfeited in its current state.");
      }

      const pickId = uid + "_" + matchupId;
      const pickRef = adminDb.collection('picks').doc(pickId);
      const pickDoc = await transaction.get(pickRef);

      if (!pickDoc.exists) {
        throw new Error("Pick not found");
      }

      const pickData = pickDoc.data();
      if (pickData.status !== 'PENDING') {
        throw new Error("Pick is no longer pending");
      }

      const chainRef = adminDb.collection('chains').doc(`${uid}_current`);
      const chainDoc = await transaction.get(chainRef);

      // Update pick
      transaction.update(pickRef, {
        status: 'LOSS',
        score: 0,
        settledAt: Date.now(),
        forfeited: true,
        updatedAt: Date.now()
      });

      // Update user stats
      let stats = userData.stats || { wins: 0, losses: 0, pushes: 0 };
      let allTimeStats = userData.allTimeStats || { wins: stats.wins, losses: stats.losses, pushes: stats.pushes };
      let statsByLeague = userData.statsByLeague || {};
      const matchupLeague = matchup.league;
      if (!statsByLeague[matchupLeague]) {
        statsByLeague[matchupLeague] = { wins: 0, losses: 0, pushes: 0 };
      }

      stats.losses += 1;
      allTimeStats.losses += 1;
      statsByLeague[matchupLeague].losses += 1;

      transaction.update(userRef, {
        stats,
        allTimeStats,
        statsByLeague,
        updatedAt: Date.now()
      });

      // Update chain
      if (chainDoc.exists) {
         let chainData = chainDoc.data();
         chainData.chain = chainData.chain > 0 ? -1 : (chainData.chain === 0 ? -1 : chainData.chain - 1);
         chainData.losses = (chainData.losses || 0) + 1;
         transaction.update(chainRef, chainData);
      }
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Forfeit pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});
apiRouter.post("/picks/cancel-pick", async (req, res) => {
  try {
    const { matchupId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const matchupRef = adminDb.collection('matchups').doc(matchupId);
      const matchupDoc = await transaction.get(matchupRef);
      if (!matchupDoc.exists) throw new Error("Matchup not found");

      const matchup = matchupDoc.data()!;
      const isCancelablePGA = matchup.league === 'PGA' && matchup.status === 'STATUS_IN_PROGRESS' && (matchup.statusDesc === 'In Progress' || matchup.statusDesc === 'Delayed');

      if (!matchup.active && !isCancelablePGA) throw new Error("Matchup is locked");
      if (matchup.status !== 'STATUS_SCHEDULED' && matchup.status !== 'STATUS_POSTPONED' && !isCancelablePGA) {
        throw new Error("Matchup has already started and cannot be cancelled");
      }

      const pickId = uid + "_" + matchupId;
      const pickRef = adminDb.collection('picks').doc(pickId);
      const pickDoc = await transaction.get(pickRef);

      if (!pickDoc.exists) {
        throw new Error("Pick not found");
      }

      const pickData = pickDoc.data()!;
      if (pickData.status !== 'PENDING') {
        throw new Error("Pick is no longer pending");
      }

      const profile = userDoc.data()!;
      const refundAmount = pickData.links ?? 0;

      transaction.delete(pickRef);

      const updateData: any = { updatedAt: Date.now() };
      if (refundAmount > 0) {
        updateData.links = profile.links + refundAmount;
      }
      transaction.update(userRef, updateData);
      if (refundAmount > 0) {
        const logRef = adminDb.collection('linkTransactions').doc();
        transaction.set(logRef, {
          userId: uid,
          username: profile.username || profile.name || 'Unknown User',
          type: 'WAGER_REFUND_CANCEL',
          amount: refundAmount,
          description: 'Wager refunded due to user cancellation',
          createdAt: Date.now()
        });
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Cancel pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/picks/make-pick", async (req, res) => {
  try {
    const { matchupId, team } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const matchupRef = adminDb.collection('matchups').doc(matchupId);
      const matchupDoc = await transaction.get(matchupRef);
      if (!matchupDoc.exists) throw new Error("Matchup not found");

      const matchup = matchupDoc.data()!;
      if (!matchup.active || isMatchupLocked(matchup)) {
        throw new Error("Matchup is locked or has already started");
      }
      if (matchup.status !== 'STATUS_SCHEDULED' && matchup.status !== 'STATUS_POSTPONED') {
        throw new Error("Matchup has already started");
      }
      if (matchup.startTime && Date.now() >= matchup.startTime) {
        throw new Error("Matchup has already started");
      }

      const profile = userDoc.data()!;
      const matchCost = matchup.cost ?? 0;
      if (matchCost > 0 && profile.links < matchCost) {
        throw new Error("Not enough links!");
      }

      const picksQuery = adminDb.collection('picks').where('userId', '==', uid).where('status', '==', 'PENDING');
      const activePicks = await transaction.get(picksQuery);
      const maxPicks = profile.premium ? 2 : 1;
      if (activePicks.size >= maxPicks) {
        throw new Error(profile.premium ? "You already have the maximum of 2 active pending picks!" : "You already have an active pick!");
      }

      const pickId = uid + "_" + matchupId;
      const newPickRef = adminDb.collection('picks').doc(pickId);

      transaction.set(newPickRef, {
        userId: uid,
        matchupId,
        pick: team,
        status: 'PENDING',
        links: matchCost,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const updateData: any = { updatedAt: Date.now() };
      if (matchCost > 0) {
        updateData.links = profile.links - matchCost;
      }
      transaction.update(userRef, updateData);
      if (matchCost > 0) {
        const logRef = adminDb.collection('linkTransactions').doc();
        transaction.set(logRef, {
          userId: uid,
          username: profile.username || profile.name || 'Unknown User',
          type: 'WAGER_PLACED',
          amount: -matchCost,
          description: 'Wager placed on pick',
          createdAt: Date.now()
        });
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Make pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});


apiRouter.post("/brackets/enter", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { bracketId } = req.body;
    if (!bracketId) throw new Error("Missing bracketId");

    await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");
      const userData = userDoc.data()!;

      const bracketRef = adminDb.collection("brackets").doc(bracketId);
      const bracketDoc = await transaction.get(bracketRef);

      let bracketData = bracketDoc.exists ? bracketDoc.data()! : null;
      if (!bracketData) {
        throw new Error("Bracket not found or has not been fully initialized yet.");
      }

      if (isBracketLocked(bracketData)) {
        throw new Error("This bracket is locked and no longer accepting entries.");
      }

      const predictionRef = adminDb.collection("bracketGamePredictions").doc(`${bracketId}_${uid}`);
      const predictionDoc = await transaction.get(predictionRef);

      if (predictionDoc.exists && predictionDoc.data()!.paid) {
        throw new Error("You have already paid to enter this bracket.");
      }

      const cost = bracketData.cost || 0;
      const currentLinks = userData.links || 0;

      if (currentLinks < cost) {
        throw new Error(`Not enough links. This bracket requires ${cost} links to enter.`);
      }

      // Deduct links from user
      transaction.update(userRef, { links: currentLinks - cost });
      const logRef = adminDb.collection('linkTransactions').doc();
      transaction.set(logRef, {
        userId: uid,
        username: userData.username || userData.name || 'Unknown User',
        type: 'BRACKET_ENTRY',
        amount: -cost,
        description: `Bracket Entry Fee for ${bracketData.name || bracketId}`,
        createdAt: Date.now()
      });

      // Add to total pot on bracket doc
      const currentPot = bracketData.totalPot || 0;
      if (bracketDoc.exists) {
        transaction.update(bracketRef, { totalPot: currentPot + cost });
      } else {
        transaction.set(bracketRef, { ...bracketData, totalPot: currentPot + cost }, { merge: true });
      }

      // Mark prediction as paid or create it
      if (predictionDoc.exists) {
         transaction.update(predictionRef, { paid: true, updatedAt: new Date().toISOString() });
      } else {
         transaction.set(predictionRef, {
             userId: uid,
             bracketId,
             selections: {},
             paid: true,
             updatedAt: new Date().toISOString()
         });
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('Bracket enter error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/link4/payout", validateAdmin, async (req, res) => {
  try {
    const { segmentId } = req.body;
    await payoutLink4Segment(segmentId);
    res.json({ success: true });
  } catch (e: any) {
    console.error('Link4 payout error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});



apiRouter.post("/admin/sync-odds", validateAdminOrApiKey, async (req, res) => {
  try {
    const { sport } = req.body || {};
    const target = (sport || 'ALL').toString().toUpperCase();

    let tennisResult: any = null;
    let soccerResult: any = null;
    let horseRacingResult: any = null;

    if (target === 'ALL' || target === 'TENNIS' || target === 'ATP' || target === 'WTA') {
      tennisResult = await syncTennisOdds();
    }
    if (target === 'ALL' || target === 'SOCCER') {
      soccerResult = await syncSoccerOdds();
    }
    if (target === 'ALL' || target === 'HORSE_RACING' || target === 'HORSE') {
      horseRacingResult = await runDailyHorseRacingScheduleSync(adminDb!);
    }

    const overallSuccess = (tennisResult ? tennisResult.success !== false : true) &&
                           (soccerResult ? soccerResult.success !== false : true) &&
                           (horseRacingResult ? horseRacingResult.success !== false : true);
    const primaryError = (!tennisResult?.success ? tennisResult?.error : undefined) ||
                         (!soccerResult?.success ? soccerResult?.error : undefined) ||
                         (!horseRacingResult?.success ? horseRacingResult?.error : undefined);

    res.status(overallSuccess ? 200 : 400).json({
      success: overallSuccess,
      ...(primaryError ? { error: primaryError } : {}),
      sport: sport || 'ALL',
      tennis: tennisResult,
      soccer: soccerResult,
      horseRacing: horseRacingResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post("/admin/horse-racing/sync-manual", validateAdminOrApiKey, async (req, res) => {
  if (!adminDb) return res.status(500).json({ error: "adminDb not configured" });
  try {
    const { date, tracks, datasetId, maxItems, spIntendedUsage, sp_intended_usage, spImprovementSuggestions, sp_improvement_suggestions, spContact, sp_contact, dataMode } = req.body || {};
    const syncResult = await runDailyHorseRacingScheduleSync(adminDb, {
      date,
      tracks,
      datasetId,
      maxItems,
      spIntendedUsage: spIntendedUsage || sp_intended_usage,
      spImprovementSuggestions: spImprovementSuggestions || sp_improvement_suggestions,
      spContact: spContact || sp_contact,
      dataMode
    });

    if (!syncResult.success) {
      return res.status(400).json({ success: false, error: syncResult.error });
    }

    invalidateMatchupCaches();

    return res.json({
      success: true,
      syncedCount: syncResult.syncedCount,
      purgedCount: syncResult.purgedCount,
      updatedGameIds: syncResult.updatedGameIds
    });
  } catch (e: any) {
    console.error("Manual horse racing sync error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/admin/sharpapi/tennis", validateAdminOrApiKey, async (req, res) => {
  try {
    const comparison = await getSharpApiTennisComparison(adminDb);
    res.status(comparison.success ? 200 : 400).json(comparison);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post("/admin/sharpapi/tennis", validateAdminOrApiKey, async (req, res) => {
  try {
    const comparison = await getSharpApiTennisComparison(adminDb);
    res.status(comparison.success ? 200 : 400).json(comparison);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post("/admin/process-notifications", validateAdmin, async (req, res) => {
  const result = await processPendingNotifications();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

apiRouter.all("/admin/sync-schedules-all", validateAdminOrApiKey, async (req, res) => {
  try {
    const scoreboardOnly = req.body?.scoreboardOnly !== undefined 
      ? req.body.scoreboardOnly 
      : (req.query?.scoreboardOnly !== undefined ? req.query.scoreboardOnly === 'true' || req.query.scoreboardOnly === '1' : false);
    const isScoreboardOnly = !!scoreboardOnly;

    const leagues = ["MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET", "PROP", "SCRIPTLESS"];

    let totalUpdated = 0;
    let totalCreated = 0;
    const errors: string[] = [];

    const chunkSize = 6;
    for (let i = 0; i < leagues.length; i += chunkSize) {
      const chunk = leagues.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (lg) => {
        if (lg === 'PROP') {
          try {
            await updateAllProps();
          } catch (e: any) {
            errors.push(`PROP: ${e.message || e}`);
          }
        } else {
          try {
            const result = await syncLeagueSchedules(lg as any, isScoreboardOnly);
            totalUpdated += result.matchupsUpdated || 0;
            totalCreated += result.scoreMatchupsCreated || 0;
          } catch (e: any) {
            errors.push(`${lg}: ${e.message || e}`);
          }
        }
      }));
    }

    try {
      await processPendingNotifications();
    } catch (notifErr) {
      console.error('Failed to process notifications from sync-schedules-all:', notifErr);
    }
    invalidateMatchupCaches();

    res.json({
      success: true,
      result: {
        new: totalCreated,
        updated: totalUpdated,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (e: any) {
    console.error("Sync schedules all error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

const handleSyncSchedules = async (req: express.Request, res: express.Response) => {
  try {
    let league = req.body?.league || req.query?.league;
    const scoreboardOnly = req.body?.scoreboardOnly !== undefined 
      ? req.body.scoreboardOnly 
      : (req.query?.scoreboardOnly !== undefined ? req.query.scoreboardOnly === 'true' || req.query.scoreboardOnly === '1' : false);
    const isScoreboardOnly = !!scoreboardOnly;
    let result: any = {};

    // Handle potential aliases from external crons
    if (league === 'MEX' || league === 'Liga MX') {
      league = 'LMX';
    }
    if (league === 'Argentina' || league === 'Liga Profesional') {
      league = 'ARG';
    }
    if (league === 'Brazil' || league === 'Serie A' || league === 'Campeonato Brasileiro') {
      league = 'BRA';
    }

    if (!league || league === 'All' || league === 'ALL') {
      // If no specific league is provided, sync all active leagues
      if (!adminDb) throw new Error('adminDb not initialized');
      const { activeLeagues } = await getActiveLeagues();

      let totalUpdated = 0;
      let totalCreated = 0;
      const errors: string[] = [];

      for (const activeLeague of activeLeagues) {
        if (activeLeague === 'PROP') {
          try {
            await updateAllProps();
          } catch (e: any) {
            errors.push(`PROP: ${e.message || e}`);
          }
        } else {
          try {
            const res = await syncLeagueSchedules(activeLeague as any, isScoreboardOnly);
            totalUpdated += res.matchupsUpdated || 0;
            totalCreated += res.scoreMatchupsCreated || 0;
          } catch (e: any) {
            errors.push(`${activeLeague}: ${e.message || e}`);
          }
        }
      }

      result = {
        success: true,
        message: 'Synced all active leagues',
        matchupsUpdated: totalUpdated,
        scoreMatchupsCreated: totalCreated,
        leaguesSynced: activeLeagues,
        errors: errors.length > 0 ? errors : undefined
      };
    } else if (league === 'PROP') {
      await updateAllProps();
      result = { success: true, message: 'Prop updates complete' };
    } else {
      result = await syncLeagueSchedules(league, isScoreboardOnly);
      try {
        await updateAllProps();
      } catch (err) {
        console.error('Failed to update props during sync-schedules:', err);
      }
    }

    // Call process-notifications internally to avoid requiring a separate cron job
    try {
      await processPendingNotifications();
    } catch (notifErr) {
      console.error('Failed to process notifications from sync-schedules:', notifErr);
    }
    invalidateMatchupCaches();
    res.json({ success: true, result });
  } catch (e: any) {
    console.error('Error in handleSyncSchedules:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

apiRouter.all(["/admin/sync-schedules", "/cron/sync-schedules", "/sync-schedules", "/"], validateAdminOrApiKey, handleSyncSchedules);
apiRouter.all(["/cron/frequent", "/frequent", "/cron/live", "/live"], validateAdminOrApiKey, (req, res) => {
  if (!req.body) req.body = {};
  req.body.scoreboardOnly = true;
  return handleSyncSchedules(req, res);
});

apiRouter.post("/shop/buy", async (req, res) => {
  try {
    const { itemId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const itemRef = adminDb.collection('shopItems').doc(itemId);
      const itemDoc = await transaction.get(itemRef);
      let item: any;

      if (!itemDoc.exists) {
        // Fallback to local manifest shop_items.json if item document has not been seeded to Firestore yet
        const catalogPath = path.resolve(process.cwd(), 'shop_items.json');
        if (fs.existsSync(catalogPath)) {
          const fileContent = fs.readFileSync(catalogPath, 'utf-8');
          const localItems = JSON.parse(fileContent);
          const found = localItems.find((i: any) => i.id === itemId);
          if (found) {
            item = found;
          }
        }
        if (!item) throw new Error("Item not found");
      } else {
        item = itemDoc.data()!;
      }

      if (item.active === false || item.forSale === false) throw new Error("Item is no longer available");

      const profile = userDoc.data()!;
      const cost = item.cost ?? 0;

      if (item.premiumOnly && !profile.premium) {
        throw new Error("This item requires ChainLink Pro.");
      }

      if (profile.links < cost) {
        throw new Error("Not enough links!");
      }

      const inventory = profile.inventory || [];
      if (inventory.includes(itemId)) {
        throw new Error("You already own this item!");
      }

      const updateData: any = {
        updatedAt: Date.now(),
        links: profile.links - cost,
        inventory: [...inventory, itemId],
        purchasedItems: [...(profile.purchasedItems || []), itemId]
      };

      transaction.update(userRef, updateData);
      const logRef = adminDb.collection('linkTransactions').doc();
      transaction.set(logRef, {
        userId: uid,
        username: profile.username || profile.name || 'Unknown User',
        type: 'SHOP_BUY_COSMETIC',
        amount: -cost,
        description: `Purchased cosmetic item: ${item.name}`,
        createdAt: Date.now()
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Buy item error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/shop/buy-merch", async (req, res) => {
  try {
    const { itemId, shippingInfo } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const itemRef = adminDb.collection('shopItems').doc(itemId);
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists) throw new Error("Item not found");

      const item = itemDoc.data()!;
      if (!item.active || item.forSale === false) throw new Error("Item is no longer available");
      if (item.type !== 'MERCH') throw new Error("Item is not a merch item");

      const profile = userDoc.data()!;
      const cost = item.cost ?? 0;

      if (item.premiumOnly && !profile.premium) {
        throw new Error("This item requires ChainLink Pro.");
      }

      if (profile.links < cost) {
        throw new Error("Not enough links!");
      }

      // We don't add merch to inventory like cosmetics, we create an order
      const updateData: any = {
        updatedAt: Date.now(),
        links: profile.links - cost,
      };

      transaction.update(userRef, updateData);

      const logRef = adminDb.collection('linkTransactions').doc();
      transaction.set(logRef, {
        userId: uid,
        username: profile.username || profile.name || 'Unknown User',
        type: 'SHOP_BUY_MERCH',
        amount: -cost,
        description: `Purchased merch item: ${item.name}`,
        createdAt: Date.now()
      });

      const ordersRef = adminDb.collection('orders').doc();
      const orderSize = shippingInfo?.size || req.body?.size || '';
      const orderColor = shippingInfo?.color || req.body?.color || '';
      transaction.set(ordersRef, {
        userId: uid,
        userEmail: profile.email || decodedToken.email || '',
        itemId: itemId,
        itemName: item.name,
        itemCost: cost,
        size: orderSize,
        color: orderColor,
        quantity: req.body?.quantity || 1,
        shippingInfo: {
          fullName: shippingInfo?.fullName || shippingInfo?.name || '',
          streetAddress: shippingInfo?.streetAddress || shippingInfo?.addressLine1 || '',
          addressLine2: shippingInfo?.addressLine2 || '',
          city: shippingInfo?.city || '',
          state: shippingInfo?.state || '',
          zip: shippingInfo?.zip || shippingInfo?.postalCode || '',
          country: shippingInfo?.country || 'USA',
          size: orderSize,
          color: orderColor,
          ...shippingInfo
        },
        status: 'PENDING',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const notificationsRef = adminDb.collection('notifications').doc();
      transaction.set(notificationsRef, {
        title: 'New Merch Order',
        body: `User ${profile.username || uid} ordered ${item.name}.`,
        audience: 'ADMIN',
        status: 'PENDING',
        scheduledTime: Date.now(),
        createdAt: Date.now()
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Buy merch error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/user/equip" , async (req, res) => {
  try {
    const { itemId, type } = req.body; // type is e.g. 'PROFILE_BANNER', 'AVATAR_RING', 'TITLE'
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const profile = userDoc.data()!;
      const ownedItems = new Set([
        ...(profile.inventory || []),
        ...(profile.purchasedItems || []),
        ...(profile.titles || [])
      ]);

      // If itemId is null, it means unequip
      if (itemId !== null && !ownedItems.has(itemId)) {
        throw new Error("You do not own this item!");
      }

      const equippedCosmetics = { ...(profile.equippedCosmetics || {}) };
      if (itemId === null) {
        delete equippedCosmetics[type];
      } else {
        equippedCosmetics[type] = itemId;
      }

      const updateData: any = {
        updatedAt: Date.now(),
        equippedCosmetics
      };

      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Equip item error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});


apiRouter.post("/user/update-variant" , async (req, res) => {
  try {
    const { variant } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const profile = userDoc.data()!;
      const equippedCosmetics = profile.equippedCosmetics || {};

      const updateData: any = {
        updatedAt: Date.now(),
        equippedCosmetics: { ...equippedCosmetics, BANNER_VARIANT: variant }
      };

      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Update variant error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/grade-matchup", validateAdmin, async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const snap = await adminDb.collection('matchups').where('gameId', '==', gameId).get();
    if (snap.empty) {
       return res.status(404).json({ success: false, error: "Matchup not found" });
    }

    const matchup = snap.docs[0].data();
    await gradeMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade
    await gradeLink4Matchups([{ ...matchup, status: 'STATUS_FINAL' }]);
    invalidateMatchupCaches();
    res.json({ success: true });
  } catch (e: any) {
    console.error("Grade matchup error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/regrade-matchup", validateAdmin, async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    if (!gameId) return res.status(400).json({ success: false, error: "Missing gameId" });

    // Look up by gameId field or direct doc ID
    let matchupDoc: any = null;
    const matchupSnap = await adminDb.collection('matchups').where('gameId', '==', gameId).get();
    if (!matchupSnap.empty) {
      matchupDoc = matchupSnap.docs[0];
    } else {
      const byIdDoc = await adminDb.collection('matchups').doc(gameId).get();
      if (byIdDoc.exists) {
        matchupDoc = byIdDoc;
      }
    }

    if (!matchupDoc) {
      return res.status(404).json({ success: false, error: "Matchup not found" });
    }

    const matchup = { id: matchupDoc.id, ...matchupDoc.data() };
    const effectiveGameId = matchup.gameId || matchupDoc.id;
    const targetMatchupIds = Array.from(new Set([String(gameId), String(effectiveGameId), String(matchupDoc.id)])).filter(Boolean);
    const homeScore = Number(matchup.homeTeam?.score || 0);
    const awayScore = Number(matchup.awayTeam?.score || 0);

    // Determine correct winnerId
    let correctWinnerId: string | null = null;
    let isTie = false;

    if (matchup.status === 'STATUS_POSTPONED') {
      isTie = true;
    } else if (matchup.type === 'OVER_UNDER') {
      const isSolo = matchup.metadata?.isSoloProp || matchup.metadata?.isSinglePlayerProp;
      const statScore = isSolo ? awayScore : (homeScore + awayScore);
      const parsedLine = (await import('./utils/matchupUtils.js')).extractOverUnderLine(matchup);
      const targetLine = parsedLine !== null ? parsedLine : Number(matchup.metadata?.overUnder ?? matchup.metadata?.targetLine ?? 0);

      // Ensure matchup metadata preserves line
      if (parsedLine !== null && matchup.metadata?.overUnder !== String(parsedLine)) {
        await matchupDoc.ref.update({
          'metadata.overUnder': String(parsedLine),
          updatedAt: Date.now()
        });
      }

      if (statScore === targetLine) isTie = true;
      else if (statScore > targetLine) correctWinnerId = 'OVER';
      else correctWinnerId = 'UNDER';
    } else {
      let adjustedHome = homeScore;
      if (matchup.type === 'SPREAD' && matchup.metadata?.spread !== undefined && matchup.metadata?.spread !== null) {
        adjustedHome += Number(matchup.metadata.spread);
      }
      if (adjustedHome === awayScore) isTie = true;
      else correctWinnerId = adjustedHome > awayScore ? matchup.homeTeam?.id : matchup.awayTeam?.id;
    }

    // Regrade standard picks across all alias IDs
    const picksSnap = await adminDb.collection('picks').where('matchupId', 'in', targetMatchupIds).get();
    let regradedPicksCount = 0;

    for (const pickDoc of picksSnap.docs) {
      const pickData = pickDoc.data();
      const currentStatus = pickData.status;
      const expectedStatus = isTie ? 'PUSH' : (pickData.pick?.id === correctWinnerId ? 'WIN' : 'LOSS');

      if (currentStatus === expectedStatus) {
        continue; // Already correctly graded
      }

      regradedPicksCount++;
      const userId = pickData.userId;
      const wager = Number(pickData.links ?? 0);
      const reward = wager + Number(matchup.reward ?? 10);

      await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb!.collection('users').doc(userId);
        const chainRef = adminDb!.collection('chains').doc(`${userId}_current`);

        const userDoc = await transaction.get(userRef);
        const chainDoc = await transaction.get(chainRef);

        if (!userDoc.exists) return;
        const userData = userDoc.data()!;
        let links = userData.links || 0;
        let stats = userData.stats || { wins: 0, losses: 0, pushes: 0 };
        let allTimeStats = userData.allTimeStats || { wins: stats.wins, losses: stats.losses, pushes: stats.pushes };
        let statsByLeague = userData.statsByLeague || {};
        const league = matchup.league || 'UNKNOWN';
        if (!statsByLeague[league]) statsByLeague[league] = { wins: 0, losses: 0, pushes: 0 };

        let chainData = chainDoc.exists ? chainDoc.data()! : { chain: 0, wins: 0, losses: 0, best: 0, allTimeBest: 0 };
        let allTimeBest = chainData.allTimeBest || chainData.best || 0;

        // Undo current status effects
        if (currentStatus === 'WIN') {
          links = Math.max(0, links - reward);
          stats.wins = Math.max(0, stats.wins - 1);
          allTimeStats.wins = Math.max(0, allTimeStats.wins - 1);
          statsByLeague[league].wins = Math.max(0, statsByLeague[league].wins - 1);
          chainData.wins = Math.max(0, chainData.wins - 1);
        } else if (currentStatus === 'LOSS') {
          stats.losses = Math.max(0, stats.losses - 1);
          allTimeStats.losses = Math.max(0, allTimeStats.losses - 1);
          statsByLeague[league].losses = Math.max(0, statsByLeague[league].losses - 1);
          chainData.losses = Math.max(0, chainData.losses - 1);
        } else if (currentStatus === 'PUSH') {
          links = Math.max(0, links - wager);
          stats.pushes = Math.max(0, stats.pushes - 1);
          allTimeStats.pushes = Math.max(0, allTimeStats.pushes - 1);
          statsByLeague[league].pushes = Math.max(0, statsByLeague[league].pushes - 1);
        }

        // Apply expected status effects
        if (expectedStatus === 'WIN') {
          links += reward;
          stats.wins += 1;
          allTimeStats.wins += 1;
          statsByLeague[league].wins += 1;
          chainData.chain = chainData.chain < 0 ? 1 : chainData.chain + 1;
          chainData.wins += 1;
          if (chainData.chain > (chainData.best || 0)) chainData.best = chainData.chain;
          if (chainData.chain > allTimeBest) allTimeBest = chainData.chain;
        } else if (expectedStatus === 'LOSS') {
          stats.losses += 1;
          allTimeStats.losses += 1;
          statsByLeague[league].losses += 1;
          chainData.chain = chainData.chain > 0 ? -1 : (chainData.chain === 0 ? -1 : chainData.chain - 1);
          chainData.losses += 1;
        } else if (expectedStatus === 'PUSH') {
          links += wager;
          stats.pushes += 1;
          allTimeStats.pushes += 1;
          statsByLeague[league].pushes += 1;
        }

        // Commit transaction updates
        transaction.update(pickDoc.ref, {
          status: expectedStatus,
          regradedAt: Date.now(),
          updatedAt: Date.now()
        });

        transaction.update(userRef, {
          links,
          stats,
          allTimeStats,
          statsByLeague,
          updatedAt: Date.now()
        });

        transaction.set(chainRef, {
          ...chainData,
          allTimeBest,
          userId,
          active: true,
          updatedAt: Date.now()
        }, { merge: true });

        // Log correction
        const logRef = adminDb!.collection('linkTransactions').doc();
        transaction.set(logRef, {
          userId,
          username: userData.username || userData.name || 'Unknown User',
          type: 'REGRADE_CORRECTION',
          amount: expectedStatus === 'WIN' ? reward : -reward,
          description: `Regrade adjustment for ${matchup.title || gameId} (from ${currentStatus} to ${expectedStatus})`,
          createdAt: Date.now()
        });
      });
    }

    // Regrade pickem picks if any exist
    const pickemPicksSnap = await adminDb.collection('pickemPicks').where('gameId', '==', gameId).get();
    let regradedPickemCount = 0;
    for (const pDoc of pickemPicksSnap.docs) {
      const pData = pDoc.data();
      const currentStatus = pData.status;
      const expectedStatus = isTie ? 'PUSH' : (pData.pick?.teamId === correctWinnerId ? 'WIN' : 'LOSS');
      if (currentStatus !== expectedStatus) {
        regradedPickemCount++;
        await pDoc.ref.update({
          status: expectedStatus,
          pointsEarned: expectedStatus === 'WIN' ? (pData.potentialPoints || 1) : 0,
          regradedAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    invalidateMatchupCaches();

    res.json({
      success: true,
      correctWinnerId,
      regradedPicksCount,
      regradedPickemCount,
      message: `Successfully regraded matchup ${gameId}. ${regradedPicksCount} picks and user chains updated.`
    });
  } catch (e: any) {
    console.error("Regrade matchup error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/release-picks", validateAdmin, async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const snap = await adminDb.collection('matchups').where('gameId', '==', gameId).get();
    if (snap.empty) {
       return res.status(404).json({ success: false, error: "Matchup not found" });
    }

    const docRef = snap.docs[0].ref;
    await docRef.update({
        status: 'STATUS_POSTPONED',
        abandoned: true,
        updatedAt: Date.now()
    });

    const matchup = (await docRef.get()).data();
    await gradeMatchups([matchup]);
    // await gradeLink4Matchups([matchup]);
    invalidateMatchupCaches();

    res.json({ success: true });
  } catch (e: any) {
    console.error("Release picks error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/webhooks/scriptless", async (req, res) => {
  if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
  try {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== process.env.SCRIPTLESS_API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
    }

    console.log("Received ScriptLess webhook. Body:", req.body);
    
    // If payload contains inline matchups (from new SDK or direct push), ingest directly to ensure zero data loss
    const rawMatchups = Array.isArray(req.body.matchups) ? req.body.matchups : (req.body.gameId || req.body.eventId ? [req.body] : []);
    if (rawMatchups.length > 0) {
      for (const item of rawMatchups) {
        const gameId = item.gameId || item.eventId;
        const homeTeam = item.homeTeam;
        const awayTeam = item.awayTeam;
        if (!gameId || !homeTeam || !awayTeam) continue;

        const matchupRef = adminDb.collection('matchups').doc(gameId);
        const existingDoc = await matchupRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : null;

        let finalStartTime = item.startTime ? getMatchupStartTime(item.startTime) : 0;
        if (finalStartTime <= 0) {
          if (existingDoc.exists && existingData?.startTime) {
            finalStartTime = existingData.startTime;
          } else {
            finalStartTime = Date.now() + 15 * 60 * 1000;
          }
        }

        const finalStatus = item.status || 'STATUS_SCHEDULED';
        const finalStatusDesc = finalStatus === 'STATUS_SCHEDULED' ? 'Upcoming' : (finalStatus === 'STATUS_FINAL' ? 'Final' : 'In Progress');

        const subLeague = item.league && item.league !== 'SCRIPTLESS' ? item.league : (item.metadata?.subLeague || 'NEXT_LEVEL_BAKER');
        const matchupData: any = {
          gameId,
          title: item.title || item.name || `${awayTeam.name} @ ${homeTeam.name}`,
          league: 'SCRIPTLESS',
          startTime: finalStartTime,
          featured: true,
          featuredType: "ScriptLess",
          homeTeam: {
            id: homeTeam.id || homeTeam.name,
            name: homeTeam.name,
            image: homeTeam.image || homeTeam.logo || "/images/scriptless.png",
            score: homeTeam.score || 0
          },
          awayTeam: {
            id: awayTeam.id || awayTeam.name,
            name: awayTeam.name,
            image: awayTeam.image || awayTeam.logo || "/images/scriptless.png",
            score: awayTeam.score || 0
          },
          status: finalStatus,
          statusDesc: finalStatusDesc,
          active: item.active !== undefined ? Boolean(item.active) : (finalStatus === 'STATUS_SCHEDULED'),
          manuallyActivated: true,
          type: "SCORE",
          metadata: {
            ...(item.metadata || {}),
            subLeague
          },
          updatedAt: Date.now()
        };

        if (!existingDoc.exists) {
          matchupData.createdAt = Date.now();
        }

        await matchupRef.set(matchupData, { merge: true });

        if (matchupData.status === 'STATUS_FINAL' || matchupData.status === 'STATUS_POSTPONED') {
          await gradeMatchups([matchupData]);
          await gradeLink4Matchups([matchupData]);
        }
      }
      invalidateMatchupCaches();
    }

    // Also trigger sync for SCRIPTLESS endpoint polling to ensure complete backwards-compatibility
    let result: any = null;
    try {
      result = await syncLeagueSchedules('SCRIPTLESS', false);
    } catch (schedErr) {
      console.warn('syncLeagueSchedules for SCRIPTLESS had minor issue:', schedErr);
    }
    
    // Update props in case a matchup finalized
    try {
      await updateAllProps();
    } catch (err) {
      console.error('Failed to update props during scriptless webhook:', err);
    }
    
    // Process notifications
    try {
      await processPendingNotifications();
    } catch (err) {
      console.error('Failed to process notifications during scriptless webhook:', err);
    }
    
    return res.json({ success: true, result, ingestedInlineCount: rawMatchups.length });
  } catch (e: any) {
    console.error("ScriptLess webhook error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/webhooks/putting", async (req, res) => {
  if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
  try {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== process.env.SCRIPTLESS_API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
    }

    console.log("Received PUTTING webhook. Body:", req.body);
    
    // If it contains matchup data, process it like /admin/matchups/external
    const { gameId, title, league, startTime, homeTeam, awayTeam, status, active } = req.body;
    
    if (gameId && homeTeam && awayTeam) {
       const matchupRef = adminDb.collection('matchups').doc(gameId);
       const existingDoc = await matchupRef.get();
       const existingData = existingDoc.exists ? existingDoc.data() : null;

       let finalStartTime = startTime ? getMatchupStartTime(startTime) : 0;
       if (finalStartTime <= 0) {
         if (existingDoc.exists && existingData?.startTime) {
           finalStartTime = existingData.startTime;
         } else {
           finalStartTime = Date.now() + 15 * 60 * 1000;
         }
       }

       const matchupData: any = {
         gameId,
         title: title || `${awayTeam.name} @ ${homeTeam.name}`,
         league: league || 'PUTTING',
         startTime: finalStartTime,
         homeTeam: {
           id: homeTeam.id,
           name: homeTeam.name,
           image: homeTeam.image || "/logo.png",
           score: homeTeam.score || 0
         },
         awayTeam: {
           id: awayTeam.id,
           name: awayTeam.name,
           image: awayTeam.image || "/logo.png",
           score: awayTeam.score || 0
         },
         status: status || 'STATUS_SCHEDULED',
         active: active !== undefined ? Boolean(active) : true,
         manuallyActivated: true,
         type: "SCORE",
         updatedAt: Date.now()
       };

       if (!existingDoc.exists) {
         matchupData.createdAt = Date.now();
       }

       await matchupRef.set(matchupData, { merge: true });

       if (matchupData.status === 'STATUS_FINAL' || matchupData.status === 'STATUS_POSTPONED') {
         await gradeMatchups([matchupData]);
         await gradeLink4Matchups([matchupData]);
       }
       
       invalidateMatchupCaches();

       // Update props and notifications
       try {
         await updateAllProps();
         await processPendingNotifications();
       } catch (err) {
         console.error('Failed to update props/notifications during putting webhook:', err);
       }
       
       return res.json({ success: true, message: "Putting Matchup webhook processed", matchup: matchupData });
    }
    
    return res.json({ success: true, message: "Webhook received" });
  } catch (e: any) {
    console.error("PUTTING webhook error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post(["/webhooks/darts", "/webhooks/flip", "/webhooks/gridiron", "/webhooks/bingo"], async (req, res) => {
  if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
  try {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== process.env.SCRIPTLESS_API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
    }

    const path = req.path.toLowerCase();
    const defaultLeague = path.includes('darts') ? 'DARTS' : path.includes('flip') ? 'FLIPCUP' : path.includes('bingo') ? 'BINGO' : 'GRIDIRON';
    console.log(`Received ${defaultLeague} webhook. Body:`, req.body);

    const matchupsList = Array.isArray(req.body.matchups) ? req.body.matchups : (req.body.gameId ? [req.body] : []);
    let processedCount = 0;

    for (const item of matchupsList) {
      const gameId = item.gameId || item.eventId;
      const homeTeam = item.homeTeam;
      const awayTeam = item.awayTeam;

      if (!gameId || !homeTeam || !awayTeam) continue;

      const matchupRef = adminDb.collection('matchups').doc(gameId);
      const existingDoc = await matchupRef.get();
      const existingData = existingDoc.exists ? existingDoc.data() : null;

      let finalStartTime = item.startTime ? getMatchupStartTime(item.startTime) : 0;
      if (finalStartTime <= 0) {
        if (existingDoc.exists && existingData?.startTime) {
          finalStartTime = existingData.startTime;
        } else {
          finalStartTime = Date.now() + 15 * 60 * 1000;
        }
      }

      const matchupData: any = {
        gameId,
        title: item.title || item.name || `${awayTeam.name} @ ${homeTeam.name}`,
        league: item.league || defaultLeague,
        startTime: finalStartTime,
        homeTeam: {
          id: homeTeam.id || homeTeam.name,
          name: homeTeam.name,
          image: homeTeam.image || homeTeam.logo || "/logo.png",
          score: homeTeam.score || 0
        },
        awayTeam: {
          id: awayTeam.id || awayTeam.name,
          name: awayTeam.name,
          image: awayTeam.image || awayTeam.logo || "/logo.png",
          score: awayTeam.score || 0
        },
        status: item.status || 'STATUS_SCHEDULED',
        active: item.active !== undefined ? Boolean(item.active) : true,
        manuallyActivated: true,
        type: "SCORE",
        metadata: item.metadata || {},
        updatedAt: Date.now()
      };

      if (!existingDoc.exists) {
        matchupData.createdAt = Date.now();
      }

      await matchupRef.set(matchupData, { merge: true });

      if (matchupData.status === 'STATUS_FINAL' || matchupData.status === 'STATUS_POSTPONED') {
        await gradeMatchups([matchupData]);
        await gradeLink4Matchups([matchupData]);
      }
      processedCount++;
    }

    invalidateMatchupCaches();

    try {
      await updateAllProps();
      await processPendingNotifications();
    } catch (err) {
      console.error(`Failed to update props/notifications during ${defaultLeague} webhook:`, err);
    }

    return res.json({ success: true, count: processedCount, message: `${defaultLeague} webhook processed` });
  } catch (e: any) {
    console.error("Spoke webhook error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/chainlink/matchups", async (req, res) => {
  if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
  try {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== process.env.SCRIPTLESS_API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
    }

    const snap = await adminDb.collection('matchups').where('active', '==', true).get();
    const matchups = snap.docs.map(doc => doc.data());

    return res.json({ success: true, matchups });
  } catch (e: any) {
    console.error("External get matchups error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/external/check-premium", async (req, res) => {
  if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
  try {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== process.env.SCRIPTLESS_API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
    }

    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: "Missing or invalid email parameter" });
    }

    const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get();

    if (snap.empty) {
      return res.json({ success: true, isPremium: false });
    }

    const userDoc = snap.docs[0].data();
    return res.json({ success: true, isPremium: !!userDoc.premium });
  } catch (e: any) {
    console.error("External check-premium error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/matchups/external", validateAdminOrApiKey, async (req, res) => {
  if (!adminDb) return res.status(500).json({ error: "adminDb not configured" });
  try {
    const { gameId, title, league, startTime, homeTeam, awayTeam, status, active } = req.body;

    if (!gameId || !league || !homeTeam || !awayTeam) {
       return res.status(400).json({ error: "Missing required fields" });
    }

    const matchupRef = adminDb.collection('matchups').doc(gameId);
    const existingDoc = await matchupRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;

    let finalStartTime = startTime ? getMatchupStartTime(startTime) : 0;
    if (finalStartTime <= 0) {
      if (existingDoc.exists && existingData?.startTime) {
        finalStartTime = existingData.startTime;
      } else {
        finalStartTime = (league === 'PUTTING' || league === 'DARTS') ? Date.now() + 15 * 60 * 1000 : Date.now();
      }
    }

    const matchupData: any = {
      gameId,
      title: title || `${awayTeam.name} @ ${homeTeam.name}`,
      league,
      startTime: finalStartTime,
      homeTeam: {
        id: homeTeam.id,
        name: homeTeam.name,
        image: homeTeam.image || "/logo.png",
        score: homeTeam.score || 0
      },
      awayTeam: {
        id: awayTeam.id,
        name: awayTeam.name,
        image: awayTeam.image || "/logo.png",
        score: awayTeam.score || 0
      },
      status: status || 'STATUS_SCHEDULED',
      active: active !== undefined ? Boolean(active) : true,
      manuallyActivated: true,
      type: "SCORE",
      updatedAt: Date.now()
    };

    if (!existingDoc.exists) {
      matchupData.createdAt = Date.now();
    }

    await matchupRef.set(matchupData, { merge: true });

    if (matchupData.status === 'STATUS_FINAL' || matchupData.status === 'STATUS_POSTPONED') {
      await gradeMatchups([matchupData]);
      await gradeLink4Matchups([matchupData]);
    }
    invalidateMatchupCaches();

    res.json({ success: true, message: "Matchup synced successfully", matchup: matchupData });
  } catch (e: any) {
    console.error("External matchup sync error:", e);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/admin/apify/horse-racing/status", validateAdminOrApiKey, async (req, res) => {
  const token = getApifyToken();
  const tokenConfigured = Boolean(token);
  const tokenMasked = tokenConfigured ? `${token.slice(0, 4)}...${token.slice(-4)}` : null;
  res.json({
    success: true,
    actorId: EQUIBASE_ACTOR_ID,
    tokenConfigured,
    tokenMasked
  });
});

apiRouter.post("/admin/apify/horse-racing/run", validateAdminOrApiKey, async (req, res) => {
  if (!adminDb) return res.status(500).json({ error: "adminDb not configured" });
  try {
    const { date, tracks, maxItems, datasetId, useLastRun, forceRun, spIntendedUsage, sp_intended_usage, spImprovementSuggestions, sp_improvement_suggestions, spContact, sp_contact, dataMode } = req.body || {};
    const fetchResult = await fetchEquibaseScraperData({
      date,
      tracks,
      maxItems,
      datasetId,
      useLastRun,
      forceRun,
      spIntendedUsage: spIntendedUsage || sp_intended_usage,
      spImprovementSuggestions: spImprovementSuggestions || sp_improvement_suggestions,
      spContact: spContact || sp_contact,
      dataMode
    });

    if (!fetchResult.success) {
      return res.status(400).json({ success: false, error: fetchResult.error });
    }

    const syncResult = await syncEquibaseRacesToMatchups(adminDb, fetchResult.cards);
    invalidateMatchupCaches();

    return res.json({
      success: true,
      cardCount: fetchResult.cards.length,
      syncedCount: syncResult.syncedCount,
      source: fetchResult.source,
      updatedGameIds: syncResult.updatedGameIds,
      cards: fetchResult.cards
    });
  } catch (e: any) {
    console.error("Apify horse racing scraper run error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/apify/horse-racing/sync-dataset", validateAdminOrApiKey, async (req, res) => {
  if (!adminDb) return res.status(500).json({ error: "adminDb not configured" });
  try {
    const { items, datasetId } = req.body || {};

    let cards = [];
    if (Array.isArray(items) && items.length > 0) {
      cards = parseEquibaseItems(items);
    } else if (datasetId) {
      const fetchResult = await fetchEquibaseScraperData({ datasetId });
      if (!fetchResult.success) {
        return res.status(400).json({ success: false, error: fetchResult.error });
      }
      cards = fetchResult.cards;
    } else {
      return res.status(400).json({ success: false, error: "Missing required 'items' array or 'datasetId'" });
    }

    const syncResult = await syncEquibaseRacesToMatchups(adminDb, cards);
    invalidateMatchupCaches();

    return res.json({
      success: true,
      cardCount: cards.length,
      syncedCount: syncResult.syncedCount,
      updatedGameIds: syncResult.updatedGameIds,
      cards
    });
  } catch (e: any) {
    console.error("Apify horse racing sync dataset error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/monthly-results", async (req, res) => {
  try {
    const monthlyResultsSnap = await adminDb!.collection('monthlyResults').get();
    const monthsMap = new Map<string, { monthKey: string; monthLabel: string; completedAt: number; totalParticipants?: number }>();

    monthlyResultsSnap.docs.forEach(doc => {
      const data = doc.data();
      monthsMap.set(doc.id, {
        monthKey: data.monthKey || doc.id,
        monthLabel: data.monthLabel || doc.id,
        completedAt: data.completedAt || 0,
        totalParticipants: data.totalParticipants || data.rankings?.length || 0,
      });
    });

    // Also scan users' historicalStats to discover any past months not yet snapshotted
    const usersSnap = await adminDb!.collection('users').get();
    usersSnap.docs.forEach(doc => {
      const uData = doc.data();
      if (uData.historicalStats) {
        Object.keys(uData.historicalStats).forEach(monthKey => {
          if (!monthsMap.has(monthKey)) {
            const hStats = uData.historicalStats[monthKey];
            monthsMap.set(monthKey, {
              monthKey,
              monthLabel: hStats.monthLabel || monthKey,
              completedAt: hStats.completedAt || 0,
            });
          }
        });
      }
    });

    const months = Array.from(monthsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    res.json({ success: true, months });
  } catch (error: any) {
    console.error("Error fetching monthly results list:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get("/monthly-results/:monthKey", async (req, res) => {
  try {
    const { monthKey } = req.params;
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, error: 'Invalid monthKey format. Expected YYYY-MM.' });
    }

    const snapshot = await getOrBuildMonthlySnapshot(adminDb!, monthKey);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: `No monthly results found for ${monthKey}` });
    }

    res.json({ success: true, result: snapshot });
  } catch (error: any) {
    console.error(`Error fetching monthly results for ${req.params.monthKey}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post("/admin/monthly-rollover", validateAdmin, async (req, res) => {
  try {
    const { monthKey: customMonthKey, force } = req.body || {};
    let monthKey = customMonthKey;
    if (!monthKey) {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const rolloverLockRef = adminDb!.collection('systemSettings').doc('monthlyRollover');
    
    let alreadyRun = false;
    if (!force) {
      await adminDb!.runTransaction(async (t) => {
        const doc = await t.get(rolloverLockRef);
        if (doc.exists) {
          const data = doc.data();
          if (data && data.lastRolloverMonth === monthKey) {
            alreadyRun = true;
            return;
          }
        }
        
        // Lock it
        t.set(rolloverLockRef, { lastRolloverMonth: monthKey, timestamp: Date.now() }, { merge: true });
      });

      if (alreadyRun) {
        return res.json({ success: true, message: `Monthly rollover for ${monthKey} was already completed automatically.` });
      }
    } else {
      await rolloverLockRef.set({ lastRolloverMonth: monthKey, timestamp: Date.now() }, { merge: true });
    }

    const snapshot = await executeRollover(adminDb!, monthKey);
    res.json({ success: true, message: `Monthly rollover for ${monthKey} completed successfully.`, result: snapshot });
  } catch (error: any) {
    console.error("Monthly rollover error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post("/admin/brackets/purge-legacy", validateAdmin, async (req, res) => {
  try {
    const legacyIds = ['world-cup-2026', 'mlb-playoffs-2026', '8YdIvl2U0TRKOGKJkYC9', 'mlb-playoffs'];
    const legacyNames = ['2026 World Cup Bracket', '2026 MLB Postseason Bracket'];

    let deletedBracketsCount = 0;
    let deletedPredictionsCount = 0;

    // 1. Delete brackets by ID or name
    const bracketsSnap = await adminDb.collection('brackets').get();
    for (const doc of bracketsSnap.docs) {
      const data = doc.data();
      if (legacyIds.includes(doc.id) || legacyNames.includes(data.name)) {
        await doc.ref.delete();
        deletedBracketsCount++;
      }
    }

    // 2. Delete predictions matching legacy bracket IDs
    const predSnap = await adminDb.collection('bracketGamePredictions').get();
    for (const pDoc of predSnap.docs) {
      const pData = pDoc.data();
      if (legacyIds.includes(pData.bracketId) || pDoc.id.startsWith('world-cup-2026_') || pDoc.id.startsWith('mlb-playoffs-2026_')) {
        await pDoc.ref.delete();
        deletedPredictionsCount++;
      }
    }

    res.json({
      success: true,
      message: `Purged ${deletedBracketsCount} legacy brackets and ${deletedPredictionsCount} predictions.`,
      deletedBracketsCount,
      deletedPredictionsCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post("/admin/force-grade-brackets", validateAdmin, async (req, res) => {
    try {
        const { adminDb } = await import('./lib/firebase-admin.js');
        const matchupsSnap = await adminDb.collection('matchups').where('status', '==', 'STATUS_FINAL').get();
        const matchups = matchupsSnap.docs.map(d => ({id: d.id, gameId: d.id, ...d.data()}));
        await gradeBrackets(matchups);
        res.json({ success: true, count: matchups.length });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.post("/admin/brackets/set-winner", validateAdmin, async (req, res) => {
  try {
    const { bracketId, matchId, winningTeam } = req.body;
    if (!bracketId || !matchId) {
      return res.status(400).json({ success: false, error: "Missing bracketId or matchId" });
    }

    const updated = await setBracketWinner(bracketId, matchId, winningTeam);
    res.json({ success: true, ...updated });
  } catch (e: any) {
    console.error("Set bracket winner error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/admin/orders", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, orders });
  } catch (e: any) {
    console.error("Fetch Admin Orders error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/link4/sync", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const picksSnap = await adminDb.collection('link4Picks').orderBy('createdAt', 'desc').limit(1000).get();
    const pickedGameIds = new Set<string>();
    picksSnap.docs.forEach(d => {
      const data = d.data();
      const picks = Array.isArray(data.picks) ? data.picks : (data.picks ? Object.values(data.picks) : []);
      picks.forEach((p: any) => {
        if (p?.matchupId) pickedGameIds.add(p.matchupId);
        else if (p?.id && p.id.startsWith('pick-')) pickedGameIds.add(p.id.replace('pick-', ''));
      });
    });

    let totalSynced = 0;
    const sportsToScrape = ["MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA"];

    for (const league of sportsToScrape) {
      try {
        const result = await scrapeLeagueSchedules(league as any, false);
        const scrapedMatchups = result.data || [];
        if (scrapedMatchups.length === 0) continue;

        const existingSnap = await adminDb.collection('matchups').where('league', '==', league).get();
        const existingMap = new Map<string, any>();
        existingSnap.docs.forEach(d => existingMap.set(d.data().gameId, d));

        let batch = adminDb.batch();
        let opCount = 0;

        for (const scrapedMatchup of scrapedMatchups) {
          const hasML = scrapedMatchup.metadata?.mlHome !== undefined && scrapedMatchup.metadata?.mlHome !== null &&
                        scrapedMatchup.metadata?.mlAway !== undefined && scrapedMatchup.metadata?.mlAway !== null;
          if (!hasML) continue;

          const gameId = scrapedMatchup.gameId;
          if (pickedGameIds.has(gameId)) continue;

          const existingDoc = existingMap.get(gameId);
          if (existingDoc) {
            batch.update(adminDb.collection('matchups').doc(existingDoc.id), {
              'metadata.mlHome': scrapedMatchup.metadata.mlHome,
              'metadata.mlAway': scrapedMatchup.metadata.mlAway,
              updatedAt: Date.now()
            });
          } else {
            batch.set(adminDb.collection('matchups').doc(gameId), {
              ...scrapedMatchup,
              active: scrapedMatchup.active,
              updatedAt: Date.now(),
              createdAt: Date.now()
            });
          }
          opCount++;
          totalSynced++;

          if (opCount >= 450) {
            await batch.commit();
            batch = adminDb.batch();
            opCount = 0;
          }
        }
        if (opCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error(`Error syncing Link4 ${league}:`, err);
      }
    }

    res.json({ success: true, count: totalSynced });
  } catch (e: any) {
    console.error("Link4 sync endpoint error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/leagues/deactivate-scheduled", validateAdmin, async (req, res) => {
  try {
    const { leagueId } = req.body;
    if (!leagueId) {
      return res.status(400).json({ success: false, error: "Missing leagueId" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const snap = await adminDb.collection('matchups')
      .where('league', '==', leagueId)
      .where('status', '==', 'STATUS_SCHEDULED')
      .get();

    let batch = adminDb.batch();
    let opCount = 0;
    let deactivatedCount = 0;

    for (const d of snap.docs) {
      batch.update(d.ref, { active: false, updatedAt: Date.now() });
      opCount++;
      deactivatedCount++;

      if (opCount >= 450) {
        await batch.commit();
        batch = adminDb.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    res.json({ success: true, deactivatedCount });
  } catch (e: any) {
    console.error("Deactivate scheduled league games error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/orders/update-status", validateAdmin, async (req, res) => {
  try {
    const { orderId, status, trackingNumber } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: "Missing orderId or status" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const updatePayload: any = {
      status,
      updatedAt: Date.now()
    };
    if (trackingNumber !== undefined) {
      updatePayload.trackingNumber = trackingNumber;
    }

    await orderRef.update(updatePayload);

    res.json({ success: true, orderId, status, trackingNumber });
  } catch (e: any) {
    console.error("Update Admin Order status error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

let chainsCache: any = null;
let chainsCacheTime = 0;

/* ==========================================
   GRIDIRON 3X3 CONTEST ENGINE & API ROUTES
   ========================================== */

apiRouter.post("/gridiron-3x3/create-contest", validateAdmin, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { name, season, weekNumber, isPublic, logoUrl, primaryColor, secondaryColor, raceTo25 } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: "Contest name is required." });
    }

    const fw = getCurrentFootballWeek();
    const activeSeason = season || fw.season;
    const activeWeek = weekNumber || fw.weekNumber;

    // Generate unique 6-character uppercase alphanumeric invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const contestRef = adminDb.collection("gridiron_3x3_contests").doc();

    const contestData: any = {
      contestId: contestRef.id,
      name: name.trim(),
      createdBy: uid,
      inviteCode,
      season: activeSeason,
      weekNumber: activeWeek,
      participants: [uid],
      isPublic: !!isPublic,
      createdAt: Date.now()
    };

    if (logoUrl && typeof logoUrl === 'string') contestData.logoUrl = logoUrl.trim();
    if (primaryColor && typeof primaryColor === 'string') contestData.primaryColor = primaryColor.trim();
    if (secondaryColor && typeof secondaryColor === 'string') contestData.secondaryColor = secondaryColor.trim();

    if (raceTo25 && typeof raceTo25 === 'object') {
      contestData.raceTo25 = {
        active: !!raceTo25.active,
        startWeek: typeof raceTo25.startWeek === 'number' ? raceTo25.startWeek : activeWeek,
        targetWins: typeof raceTo25.targetWins === 'number' ? raceTo25.targetWins : 25
      };
    }

    await contestRef.set(contestData);

    // Initialize leaderboard entry for creator
    await updateGridironLeaderboard(contestRef.id);

    // Auto-populate line snapshot for this campaign week if missing AND lock time reached
    const lockTime = getGridironLinesLockTime(activeSeason, activeWeek);
    if (Date.now() >= lockTime) {
      const linesDocId = `${activeSeason}_week_${activeWeek.toString().padStart(2, '0')}`;
      const linesSnap = await adminDb.collection("gridiron_3x3_lines").doc(linesDocId).get();
      if (!linesSnap.exists) {
        fetchAndStoreTuesdayGridironLines(activeSeason, activeWeek).catch(err => {
          console.warn("[CreateContest] Auto line snapshot sync warning:", err?.message || err);
        });
      }
    }

    res.json({ success: true, contest: contestData });
  } catch (e: any) {
    console.error("Create Gridiron 3x3 contest error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/gridiron-3x3/join-contest", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { inviteCode } = req.body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return res.status(400).json({ success: false, error: "Invite code is required." });
    }

    const cleanCode = inviteCode.trim().toUpperCase();
    const snap = await adminDb.collection("gridiron_3x3_contests")
      .where("inviteCode", "==", cleanCode)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ success: false, error: "Contest not found with that invite code." });
    }

    const contestDoc = snap.docs[0];
    const contestData = contestDoc.data();
    const participants: string[] = contestData.participants || [];

    if (!participants.includes(uid)) {
      const { FieldValue } = await import('firebase-admin/firestore');
      await contestDoc.ref.update({
        participants: FieldValue.arrayUnion(uid)
      });
      await updateGridironLeaderboard(contestDoc.id);
    }

    res.json({
      success: true,
      contest: {
        ...contestData,
        contestId: contestDoc.id,
        participants: Array.from(new Set([...participants, uid]))
      }
    });
  } catch (e: any) {
    console.error("Join Gridiron 3x3 contest error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/gridiron-3x3/contests", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    await ensureThePicksContest();

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === "ADMIN";

    let contests: any[] = [];
    if (isAdmin) {
      const snap = await adminDb.collection("gridiron_3x3_contests").get();
      contests = snap.docs.map(doc => ({ contestId: doc.id, ...doc.data() }));
    } else {
      const [userSnap, publicSnap] = await Promise.all([
        adminDb.collection("gridiron_3x3_contests")
          .where("participants", "array-contains", uid)
          .get(),
        adminDb.collection("gridiron_3x3_contests")
          .where("isPublic", "==", true)
          .get()
      ]);

      const contestMap = new Map<string, any>();
      userSnap.docs.forEach(doc => contestMap.set(doc.id, { contestId: doc.id, ...doc.data() }));
      publicSnap.docs.forEach(doc => contestMap.set(doc.id, { contestId: doc.id, ...doc.data() }));

      contests = Array.from(contestMap.values());
    }

    res.json({ success: true, contests });
  } catch (e: any) {
    console.error("Fetch Gridiron 3x3 contests error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/gridiron-3x3/lines/:season/:weekNumber", validateAuth, async (req, res) => {
  try {
    const season = parseInt(req.params.season, 10);
    const weekNumber = parseInt(req.params.weekNumber, 10);

    if (isNaN(season) || isNaN(weekNumber)) {
      return res.status(400).json({ success: false, error: "Invalid season or weekNumber parameters." });
    }

    const lockTime = getGridironLinesLockTime(season, weekNumber);
    const now = Date.now();

    // Do not show or generate snapshot lines before Tuesday 12:00 PM EST odds finalization
    if (now < lockTime) {
      const lockDate = new Date(lockTime);
      const formattedLockDate = lockDate.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return res.json({
        success: true,
        lines: null,
        isLocked: true,
        lockTime,
        message: `Picks for Week ${weekNumber} open after Tuesday odds finalization on ${formattedLockDate}.`
      });
    }

    const docId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
    let docSnap = await adminDb.collection("gridiron_3x3_lines").doc(docId).get();

    if (!docSnap.exists || (Array.isArray(docSnap.data()?.games) && docSnap.data()?.games.length === 0)) {
      // Auto-trigger ingestion if snapshot lines document is missing or empty and current time >= Tuesday 12:00 PM EST
      await fetchAndStoreTuesdayGridironLines(season, weekNumber);
      docSnap = await adminDb.collection("gridiron_3x3_lines").doc(docId).get();
    }

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: `No static lines snapshot found for ${docId}` });
    }

    res.json({ success: true, lines: docSnap.data(), isLocked: false });
  } catch (e: any) {
    console.error("Fetch Gridiron 3x3 lines error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/gridiron-3x3/leaderboard/:contestId", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { contestId } = req.params;

    if (!contestId) {
      return res.status(400).json({ success: false, error: "Invalid contestId." });
    }

    const contestDoc = await adminDb.collection("gridiron_3x3_contests").doc(contestId).get();
    if (!contestDoc.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }

    const participants: string[] = contestDoc.data()?.participants || [];
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === "ADMIN";

    if (!isAdmin && !participants.includes(uid)) {
      return res.status(403).json({ success: false, error: "Access denied. You are not a participant in this contest." });
    }

    const season = contestDoc.data()?.season || 2026;
    const weekNum = contestDoc.data()?.weekNumber || 1;
    await gradeGridironWeek(season, weekNum, { contestId });
    const leaderboard = (await updateGridironLeaderboard(contestId)) || [];

    res.json({ success: true, leaderboard });
  } catch (e: any) {
    console.error("Fetch Gridiron 3x3 leaderboard error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/gridiron-3x3/entries/:contestId/:weekNumber", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { contestId, weekNumber } = req.params;
    const weekNum = parseInt(weekNumber, 10);

    if (!contestId || isNaN(weekNum)) {
      return res.status(400).json({ success: false, error: "Invalid contestId or weekNumber." });
    }

    const contestDoc = await adminDb.collection("gridiron_3x3_contests").doc(contestId).get();
    if (!contestDoc.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }

    const participants: string[] = contestDoc.data()?.participants || [];
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === "ADMIN";

    if (!isAdmin && !participants.includes(uid)) {
      return res.status(403).json({ success: false, error: "Access denied. You are not a participant in this contest." });
    }

    const season = contestDoc.data()?.season || 2026;

    // Grade week & refresh leaderboard for contest
    let leaderboard: any[] = [];
    try {
      await gradeGridironWeek(season, weekNum, { contestId });
      leaderboard = (await updateGridironLeaderboard(contestId)) || [];
    } catch (e) {
      console.warn("[GridironEntries] Auto-grade on fetch entries error:", e);
    }

    // 1. Check active individual entries
    const entriesSnap = await adminDb.collection("gridiron_3x3_entries")
      .where("contestId", "==", contestId)
      .where("weekNumber", "==", weekNum)
      .get();

    let rawEntries: GridironEntry[] = [];

    if (!entriesSnap.empty) {
      rawEntries = entriesSnap.docs.map(doc => ({ entryId: doc.id, ...(doc.data() as GridironEntry) }));
    } else {
      // 2. Fallback to weekly consolidated snapshot document if individual entries were purged
      const docId = `${season}_week_${weekNum.toString().padStart(2, '0')}`;
      const snapshotSnap = await adminDb.collection("gridiron_3x3_weekly_snapshots").doc(docId).get();

      if (snapshotSnap.exists) {
        const snapshotEntries: GridironEntry[] = snapshotSnap.data()?.entries || [];
        rawEntries = snapshotEntries.filter(e => e.contestId === contestId);
      }
    }

    const now = Date.now();

    // Load lines snapshot for game status lookup in blind reveal checks
    const linesDocId = `${season}_week_${weekNum.toString().padStart(2, '0')}`;
    const linesSnap = await adminDb.collection("gridiron_3x3_lines").doc(linesDocId).get();
    const snapshotGames: any[] = linesSnap.exists ? (linesSnap.data()?.games || []) : [];
    const snapshotGamesMap = new Map<string, any>(snapshotGames.map((g: any) => [String(g.gameId), g]));

    // BLIND REVEAL SECURITY: Mask competitor picks if kickoffTime > now and game not in progress/final
    const entries = rawEntries.map(data => {
      const isOwner = data.userId === uid;

      const maskedPicks = (data.picks || []).map(p => {
        const snapGame = snapshotGamesMap.get(String(p.gameId));
        const kickoffTimeMs = typeof p.kickoffTime === 'number'
          ? p.kickoffTime
          : (p.kickoffTime?.toMillis ? p.kickoffTime.toMillis() : new Date(p.kickoffTime).getTime());

        const isLocked = now >= kickoffTimeMs || (snapGame && (snapGame.status === 'in_progress' || snapGame.status === 'final' || (!!snapGame.status && snapGame.status !== 'scheduled')));

        if (isOwner || isLocked) {
          return {
            ...p,
            isLocked
          };
        } else {
          // Competitor pick before kickoff lock => MASK IT!
          return {
            gameId: p.gameId,
            league: p.league,
            pickType: p.pickType,
            selection: "HIDDEN",
            value: 0,
            kickoffTime: p.kickoffTime,
            status: "pending",
            isLocked: false
          };
        }
      });

      return {
        ...data,
        picks: maskedPicks
      };
    });

    res.json({ success: true, entries, leaderboard });
  } catch (e: any) {
    console.error("Fetch Gridiron 3x3 entries error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/gridiron-3x3/submit-entry", validateAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { contestId, season, weekNumber, picks } = req.body;

    if (!contestId || !season || !weekNumber || !Array.isArray(picks)) {
      return res.status(400).json({ success: false, error: "Missing required entry parameters." });
    }

    // One-pick-per-game rule: ensure distinct gameIds
    const gameIds = new Set(picks.map((p: any) => p.gameId));
    if (gameIds.size !== picks.length) {
      return res.status(400).json({ success: false, error: "Entry cannot contain duplicate picks for the same game." });
    }

    if (picks.length > 6) {
      return res.status(400).json({ success: false, error: "Entry cannot contain more than 6 picks." });
    }

    // Verify participant in contest
    const contestDoc = await adminDb.collection("gridiron_3x3_contests").doc(contestId).get();
    if (!contestDoc.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }
    const participants: string[] = contestDoc.data()?.participants || [];
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === "ADMIN";

    if (!isAdmin && !participants.includes(uid)) {
      return res.status(403).json({ success: false, error: "You must join this contest before submitting an entry." });
    }

    // Load authoritative static snapshot lines document
    const linesDocId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
    const linesSnap = await adminDb.collection("gridiron_3x3_lines").doc(linesDocId).get();
    const lockTime = getGridironLinesLockTime(season, weekNumber);
    const now = Date.now();

    if (!linesSnap.exists) {
      if (now < lockTime) {
        return res.status(400).json({ success: false, error: `Picks for Week ${weekNumber} are not open yet. Pick window opens after Tuesday odds finalization.` });
      }
      return res.status(400).json({ success: false, error: `Lines snapshot not found for ${linesDocId}. Picks cannot be submitted without static lines.` });
    }

    const snapshotGames = linesSnap.data()?.games || [];
    const availableCfbCount = snapshotGames.filter((g: any) => g.league === "CFB").length;
    const requiredCfb = snapshotGames.length === 0 ? 3 : Math.min(3, availableCfbCount);
    const requiredNfl = 6 - requiredCfb;

    const snapshotGamesMap = new Map<string, any>(
      snapshotGames.map((g: any) => [g.gameId, g])
    );

    const entryId = `${contestId}_${uid}_${weekNumber}`;
    const entryRef = adminDb.collection("gridiron_3x3_entries").doc(entryId);
    const existingEntryDoc = await entryRef.get();
    const existingPicksList: GridironPick[] = existingEntryDoc.exists ? (existingEntryDoc.data() as GridironEntry).picks || [] : [];

    const existingPicksMap = new Map<string, GridironPick>(
      existingPicksList.map(ep => [ep.gameId, ep])
    );

    const incomingPicksMap = new Map<string, any>(
      picks.map((p: any) => [p.gameId, p])
    );

    const validatedPicksMap = new Map<string, GridironPick>();

    // 1. Process all locked existing picks first to prevent illegal removal or modification
    for (const ep of existingPicksList) {
      const snapGame = snapshotGamesMap.get(ep.gameId);
      const kickoffTimeMs = snapGame ? (typeof snapGame.kickoffTime === 'number'
        ? snapGame.kickoffTime
        : (snapGame.kickoffTime?.toMillis ? snapGame.kickoffTime.toMillis() : new Date(snapGame.kickoffTime).getTime()))
        : (typeof ep.kickoffTime === 'number' ? ep.kickoffTime : new Date(ep.kickoffTime).getTime());

      const isGameLocked = now >= kickoffTimeMs || (snapGame && (snapGame.status === 'in_progress' || snapGame.status === 'final' || (!!snapGame.status && snapGame.status !== 'scheduled')));

      if (isGameLocked) {
        // Game has kicked off - pick is locked
        const incoming = incomingPicksMap.get(ep.gameId);
        if (incoming && (incoming.selection !== ep.selection || incoming.value !== ep.value)) {
          const gameTitle = snapGame ? `${snapGame.awayTeam.name} @ ${snapGame.homeTeam.name}` : `Game ${ep.gameId}`;
          return res.status(400).json({ success: false, error: `Game ${gameTitle} has already kicked off and cannot be modified.` });
        }
        // Auto-retain locked existing pick
        validatedPicksMap.set(ep.gameId, ep);
      }
    }

    // 2. Process incoming picks
    for (const p of picks) {
      if (validatedPicksMap.has(p.gameId)) {
        // Already validated as locked existing pick
        continue;
      }

      const snapGame = snapshotGamesMap.get(p.gameId);
      if (!snapGame) {
        return res.status(400).json({ success: false, error: `Game ${p.gameId} is not on the official Tuesday snapshot lines board.` });
      }

      const kickoffTimeMs = typeof snapGame.kickoffTime === 'number'
        ? snapGame.kickoffTime
        : (snapGame.kickoffTime?.toMillis ? snapGame.kickoffTime.toMillis() : new Date(snapGame.kickoffTime).getTime());

      const isGameLocked = now >= kickoffTimeMs || snapGame.status === 'in_progress' || snapGame.status === 'final' || (!!snapGame.status && snapGame.status !== 'scheduled');

      if (isGameLocked) {
        return res.status(400).json({ success: false, error: `Game ${snapGame.awayTeam.name} @ ${snapGame.homeTeam.name} has already kicked off and cannot be picked.` });
      }

      let authoritativeValue = 0;
      if (p.selection === "away_spread") authoritativeValue = snapGame.spread.awaySpread;
      else if (p.selection === "home_spread") authoritativeValue = snapGame.spread.homeSpread;
      else if (p.selection === "over" || p.selection === "under") authoritativeValue = snapGame.total.line;
      else return res.status(400).json({ success: false, error: `Invalid selection type ${p.selection}` });

      const existingPick = existingPicksMap.get(p.gameId);

      validatedPicksMap.set(p.gameId, {
        gameId: snapGame.gameId,
        league: snapGame.league,
        pickType: (p.selection === "away_spread" || p.selection === "home_spread") ? "spread" : "total",
        selection: p.selection,
        value: authoritativeValue,
        kickoffTime: kickoffTimeMs,
        status: existingPick?.status || "pending"
      });
    }

    const validatedPicks = Array.from(validatedPicksMap.values());

    const nflPicks = validatedPicks.filter((p) => p.league === "NFL");
    const cfbPicks = validatedPicks.filter((p) => p.league === "CFB");

    if (nflPicks.length > requiredNfl) {
      return res.status(400).json({ success: false, error: `Entry cannot exceed ${requiredNfl} NFL picks.` });
    }
    if (cfbPicks.length > requiredCfb) {
      return res.status(400).json({ success: false, error: `Entry cannot exceed ${requiredCfb} CFB picks.` });
    }

    const userData = userDoc.data();
    const displayName = userData?.username || userData?.name || "Player";

    const entryData: GridironEntry = {
      entryId,
      contestId,
      userId: uid,
      displayName,
      season,
      weekNumber,
      createdAt: existingEntryDoc.exists ? existingEntryDoc.data()?.createdAt || now : now,
      updatedAt: now,
      picks: validatedPicks
    };

    await entryRef.set(entryData, { merge: true });
    await updateGridironLeaderboard(contestId);

    res.json({ success: true, entryId, entry: entryData });
  } catch (e: any) {
    console.error("Submit Gridiron 3x3 entry error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/gridiron-3x3/update-contest", validateAdmin, async (req, res) => {
  try {
    const { contestId, name, isPublic, logoUrl, primaryColor, secondaryColor, season, weekNumber, raceTo25 } = req.body;

    if (!contestId) {
      return res.status(400).json({ success: false, error: "contestId is required." });
    }

    const contestRef = adminDb.collection("gridiron_3x3_contests").doc(contestId);
    const docSnap = await contestRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }

    const existingData = docSnap.data();
    const updateData: any = {};
    if (name && typeof name === 'string') updateData.name = name.trim();
    if (isPublic !== undefined) updateData.isPublic = !!isPublic;
    if (logoUrl !== undefined) updateData.logoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : null;
    if (primaryColor !== undefined) updateData.primaryColor = typeof primaryColor === 'string' ? primaryColor.trim() : null;
    if (secondaryColor !== undefined) updateData.secondaryColor = typeof secondaryColor === 'string' ? secondaryColor.trim() : null;
    if (typeof season === 'number') updateData.season = season;
    if (typeof weekNumber === 'number') updateData.weekNumber = weekNumber;

    if (raceTo25 && typeof raceTo25 === 'object') {
      const existingRace = existingData?.raceTo25;
      const resetWinner = !!raceTo25.resetWinner || (raceTo25.startWeek !== undefined && raceTo25.startWeek !== existingRace?.startWeek);

      let pastRaces = existingRace?.pastRaces || [];
      if (resetWinner && existingRace?.winnerUserId) {
        pastRaces = [
          ...pastRaces,
          {
            startWeek: existingRace.startWeek || 1,
            targetWins: existingRace.targetWins || 25,
            winnerUserId: existingRace.winnerUserId,
            winnerDisplayName: existingRace.winnerDisplayName || 'Player',
            winnerWeek: existingRace.winnerWeek || existingData?.weekNumber || 1,
            completedAt: Date.now()
          }
        ];
      }

      updateData.raceTo25 = {
        active: !!raceTo25.active,
        startWeek: typeof raceTo25.startWeek === 'number' ? raceTo25.startWeek : (existingRace?.startWeek || existingData?.weekNumber || 1),
        targetWins: typeof raceTo25.targetWins === 'number' ? raceTo25.targetWins : (existingRace?.targetWins || 25),
        winnerUserId: resetWinner ? null : (existingRace?.winnerUserId || null),
        winnerDisplayName: resetWinner ? null : (existingRace?.winnerDisplayName || null),
        winnerWeek: resetWinner ? null : (existingRace?.winnerWeek || null),
        pastRaces
      };
    }

    await contestRef.update(updateData);
    await updateGridironLeaderboard(contestId);
    const updatedDoc = await contestRef.get();

    res.json({ success: true, contest: { contestId: updatedDoc.id, ...updatedDoc.data() } });
  } catch (e: any) {
    console.error("Update Gridiron 3x3 contest error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/gridiron-3x3/delete-contest", validateAdmin, async (req, res) => {
  try {
    const { contestId } = req.body;

    if (!contestId) {
      return res.status(400).json({ success: false, error: "contestId is required." });
    }

    const contestRef = adminDb.collection("gridiron_3x3_contests").doc(contestId);
    const contestDoc = await contestRef.get();
    if (!contestDoc.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }

    const batch = adminDb.batch();

    // 1. Delete Leaderboard subcollection
    const lbSnap = await contestRef.collection("leaderboard").get();
    lbSnap.docs.forEach(doc => batch.delete(doc.ref));

    // 2. Delete active entries
    const entriesSnap = await adminDb.collection("gridiron_3x3_entries")
      .where("contestId", "==", contestId)
      .get();
    entriesSnap.docs.forEach(doc => batch.delete(doc.ref));

    // 3. Delete contest doc
    batch.delete(contestRef);

    await batch.commit();

    res.json({ success: true, deletedContestId: contestId });
  } catch (e: any) {
    console.error("Delete Gridiron 3x3 contest error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/gridiron-3x3/sync-lines", validateAdmin, async (req, res) => {
  try {
    const { season, weekNumber } = req.body;
    const result = await fetchAndStoreTuesdayGridironLines(season, weekNumber);
    res.json(result);
  } catch (e: any) {
    console.error("Admin sync Gridiron lines error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/gridiron-3x3/grade", validateAdmin, async (req, res) => {
  try {
    const { season, weekNumber, contestId, finalizeAndPurge } = req.body;
    const fw = getCurrentFootballWeek();
    const activeSeason = season || fw.season;
    const activeWeek = weekNumber || fw.weekNumber;

    const result = await gradeGridironWeek(activeSeason, activeWeek, {
      finalizeAndPurge: !!finalizeAndPurge,
      contestId: contestId ? String(contestId) : undefined
    });
    res.json(result);
  } catch (e: any) {
    console.error("Admin grade Gridiron error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/chains", validateAuth, async (req, res) => {
  try {
    if (chainsCache && Date.now() - chainsCacheTime < CACHE_TTL) {
      return res.json({ chains: chainsCache, cached: true });
    }
    const snap = await adminDb.collection('chains').get();
    const chains = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    chainsCache = chains;
    chainsCacheTime = Date.now();
    
    return res.json({ chains });
  } catch (error) {
    console.error('Error fetching chains', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

apiRouter.get("/system-settings/play-banner", async (req, res) => {
  try {
    if (playBannerCache && Date.now() - playBannerCache.time < PLAY_BANNER_CACHE_TTL) {
      return res.json({ success: true, banner: playBannerCache.data });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection('systemSettings').doc('playBanner').get();
    const banner = snap.exists ? snap.data() : null;
    playBannerCache = { data: banner, time: Date.now() };
    res.json({ success: true, banner });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/matchups/active", async (req, res) => {
  try {
    if (activeMatchupsCache && Date.now() - activeMatchupsCache.time < ACTIVE_MATCHUPS_CACHE_TTL) {
      return res.json({ success: true, matchups: activeMatchupsCache.data });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    if (!activeMatchupsInFlight) {
      activeMatchupsInFlight = (async () => {
        const nowMs = Date.now();
        const minStartTime = nowMs - 24 * 60 * 60 * 1000;
        const maxStartTime = nowMs + 48 * 60 * 60 * 1000;

        // Fetch live/postponed/delayed games and scheduled games
        // We query STATUS_SCHEDULED and filter by rolling time window in-memory using getMatchupStartTime
        // This guarantees documents with either numeric ms or ISO string startTime are both preserved
        const [liveSnap, scheduledSnap] = await Promise.all([
          adminDb.collection('matchups')
            .where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_POSTPONED', 'STATUS_DELAYED'])
            .get()
            .catch(() => ({ docs: [] } as any)),
          adminDb.collection('matchups')
            .where('status', '==', 'STATUS_SCHEDULED')
            .get()
            .catch(() => ({ docs: [] } as any))
        ]);

        const matchupsMap = new Map<string, any>();
        liveSnap.docs.forEach((doc: any) => {
          matchupsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        scheduledSnap.docs.forEach((doc: any) => {
          const data = doc.data();
          const startMs = getMatchupStartTime(data.startTime);
          // Keep scheduled games in rolling -24h to +72h window (or games with 0/unknown startTime or special leagues)
          const isSpecialLeague = ['PGA', 'PUTTING', 'SCRIPTLESS', 'DARTS', 'FLIPCUP'].includes(data.league);
          if (isSpecialLeague || data.manuallyActivated || startMs === 0 || (startMs >= minStartTime && startMs <= maxStartTime + 24 * 60 * 60 * 1000)) {
            if (!matchupsMap.has(doc.id)) {
              matchupsMap.set(doc.id, { id: doc.id, ...data });
            }
          }
        });

        const matchups = Array.from(matchupsMap.values());
        activeMatchupsCache = { data: matchups, time: Date.now() };
        return matchups;
      })().finally(() => {
        activeMatchupsInFlight = null;
      });
    }

    const matchups = await activeMatchupsInFlight;
    res.json({ success: true, matchups });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/matchups/by-ids", async (req, res) => {
  try {
    const idsStr = req.query.ids;
    if (!idsStr || typeof idsStr !== 'string') {
      return res.json({ success: true, matchups: [] });
    }
    const ids = Array.from(new Set(idsStr.split(',').map(s => s.trim()).filter(Boolean))).slice(0, 50);
    if (ids.length === 0) {
      return res.json({ success: true, matchups: [] });
    }

    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    pruneMapCache(matchupsByIdCache, MATCHUPS_BY_ID_CACHE_TTL, MAX_CACHE_ENTRIES);

    const now = Date.now();
    const uncachedIds: string[] = [];
    const resultMap = new Map<string, any>();

    for (const id of ids) {
      const cached = matchupsByIdCache.get(id);
      if (cached && now - cached.time < MATCHUPS_BY_ID_CACHE_TTL) {
        if (cached.data) resultMap.set(id, cached.data);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length > 0) {
      for (let i = 0; i < uncachedIds.length; i += 30) {
        const chunk = uncachedIds.slice(i, i + 30);
        const foundGameIds = new Set<string>();

        // OPTIMIZATION: Try primary key fetch via adminDb.getAll first (avoids secondary index scan)
        if (typeof adminDb.getAll === 'function') {
          try {
            const docRefs = chunk.map(id => adminDb.collection('matchups').doc(id));
            const docSnaps = await adminDb.getAll(...docRefs);
            docSnaps.forEach(snap => {
              if (snap.exists) {
                const data = { id: snap.id, ...snap.data() };
                const gameId = (data as any).gameId || snap.id;
                foundGameIds.add(gameId);
                matchupsByIdCache.set(gameId, { data, time: now });
                resultMap.set(gameId, data);
              }
            });
          } catch (getAllErr) {
            console.warn('[apiRouter] adminDb.getAll failed, falling back to query:', getAllErr);
          }
        }

        // For any remaining IDs not found by direct doc ID, fall back to where('gameId', 'in', ...)
        const remainingChunk = chunk.filter(id => !foundGameIds.has(id));
        if (remainingChunk.length > 0) {
          const snap = await adminDb.collection('matchups').where('gameId', 'in', remainingChunk).get();
          snap.docs.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            const gameId = (data as any).gameId || doc.id;
            foundGameIds.add(gameId);
            matchupsByIdCache.set(gameId, { data, time: now });
            resultMap.set(gameId, data);
          });
        }

        chunk.forEach(gameId => {
          if (!foundGameIds.has(gameId)) {
            matchupsByIdCache.set(gameId, { data: null, time: now });
          }
        });
      }
    }

    const matchups = ids.map(id => resultMap.get(id)).filter(Boolean);
    res.json({ success: true, matchups });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/link4/matchups/:segmentId", async (req, res) => {
  try {
    const { segmentId } = req.params;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    pruneMapCache(link4MatchupsCache, LINK4_MATCHUPS_CACHE_TTL, MAX_CACHE_ENTRIES);

    const cached = link4MatchupsCache.get(segmentId);
    if (cached && Date.now() - cached.time < LINK4_MATCHUPS_CACHE_TTL) {
      return res.json({ success: true, matchups: cached.data });
    }

    if (!link4MatchupsInFlight.has(segmentId)) {
      const promise = (async () => {
        const snap = await adminDb.collection('link4Matchups').where('segmentId', '==', segmentId).get();
        const matchups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        link4MatchupsCache.set(segmentId, { data: matchups, time: Date.now() });
        return matchups;
      })().finally(() => {
        link4MatchupsInFlight.delete(segmentId);
      });
      link4MatchupsInFlight.set(segmentId, promise);
    }

    const matchups = await link4MatchupsInFlight.get(segmentId)!;
    res.json({ success: true, matchups });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
