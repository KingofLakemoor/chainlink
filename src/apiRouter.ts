import { executeRollover } from './services/monthlyRollover.js';
import { processPendingNotifications } from './services/notificationProcessor.js';
import { gradeBrackets } from './services/bracketGrader.js';
import { fetchAndStoreTuesdayGridironLines, getCurrentFootballWeek, getGridironLinesLockTime } from './services/gridironIngestion.js';
import { gradeGridironWeek, updateGridironLeaderboard } from './services/gridironGrader.js';
import { GridironPick, GridironEntry } from './types/gridiron.js';
import express from 'express';
import { adminAuth, adminDb, adminMessaging } from './lib/firebase-admin.js';
import { scrapeLeagueSchedules, syncLeagueSchedules } from './services/scheduleProcessor.js';
import { gradeMatchups } from './services/grader.js';
import { gradeLink4Matchups, payoutLink4Segment } from './services/link4Grader.js';
import { gradePickemMatchups, payoutPickemCampaign } from './services/pickemGrader.js';
import { updateAllProps } from './services/propGrader.js';
import { autoGenerateNFLProps } from './services/propGenerator.js';
import { syncTennisOdds, syncSoccerOdds } from './services/oddsProcessor.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia' as any, // Cast to any to bypass TS error for newer stripe versions
});

export const apiRouter = express.Router();

let cachedProgress = { raised: 0, goal: 1000, pot: 0, maxPot: 500, timestamp: 0 };
const CHARITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
      const campaignSnap = await adminDb.collection('pickemCampaigns').where('name', '==', 'YES Day Walk for Autism 2026').limit(1).get();
      if (!campaignSnap.empty) {
        const campaignId = campaignSnap.docs[0].id;
        const snapshot = await adminDb.collection('pickemParticipants').where('campaignId', '==', campaignId).get();
        snapshot.forEach(doc => {
          const data = doc.data();
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

apiRouter.get("/users/public", validateAuth, async (req, res) => {
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
    const providedApiKey = req.headers['x-api-key'];
    if (providedApiKey && providedApiKey === process.env.SCRIPTLESS_API_KEY) {
       return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid API key/token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    (req as any).uid = uid;
    next();
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

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
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

apiRouter.get("/admin/gridiron-3x3/contests", validateAdmin, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection("gridiron_3x3_contests").get();
    let contests: any[] = snap.docs.map(doc => ({ contestId: doc.id, ...doc.data() }));

    // Ensure "Test 1" contest group exists in Firestore if not already created
    const hasTest1 = contests.some((c: any) => c.name === "Test 1" || c.contestId === "test_1");
    if (!hasTest1) {
      const test1Contest = {
        contestId: "test_1",
        name: "Test 1",
        createdBy: (req as any).uid || "admin",
        inviteCode: "TEST01",
        season: 2026,
        weekNumber: 1,
        participants: [(req as any).uid || "admin", "test_user_1", "test_user_2"],
        createdAt: Date.now()
      };
      await adminDb.collection("gridiron_3x3_contests").doc("test_1").set(test1Contest, { merge: true });
      contests = [test1Contest, ...contests];
    }

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

    // Populate user entries for "Test 1" if empty and requested
    if (entries.length === 0 && (contestId === "test_1" || !contestId)) {
      const now = Date.now();
      const testEntries: GridironEntry[] = [
        {
          entryId: "test_1_user_1_1",
          contestId: "test_1",
          userId: (req as any).uid || "admin",
          displayName: "Admin Player",
          season: seasonNum,
          weekNumber: weekNum,
          createdAt: now - 86400000,
          updatedAt: now,
          picks: [
            { gameId: "g1", league: "NFL", pickType: "spread", selection: "home_spread", value: -3.5, kickoffTime: now - 7200000, status: "pending" },
            { gameId: "g2", league: "NFL", pickType: "total", selection: "over", value: 47.5, kickoffTime: now - 3600000, status: "pending" },
            { gameId: "g3", league: "NFL", pickType: "spread", selection: "away_spread", value: 6.0, kickoffTime: now + 86400000, status: "pending" },
            { gameId: "g4", league: "CFB", pickType: "spread", selection: "home_spread", value: -10.5, kickoffTime: now + 86400000, status: "pending" },
            { gameId: "g5", league: "CFB", pickType: "total", selection: "under", value: 52.0, kickoffTime: now + 86400000, status: "pending" },
            { gameId: "g6", league: "CFB", pickType: "spread", selection: "away_spread", value: 3.5, kickoffTime: now + 86400000, status: "pending" }
          ]
        },
        {
          entryId: "test_1_user_2_1",
          contestId: "test_1",
          userId: "test_user_2",
          displayName: "Gridiron Master",
          season: seasonNum,
          weekNumber: weekNum,
          createdAt: now - 86400000,
          updatedAt: now,
          picks: [
            { gameId: "g1", league: "NFL", pickType: "spread", selection: "away_spread", value: 3.5, kickoffTime: now - 7200000, status: "pending" },
            { gameId: "g2", league: "NFL", pickType: "total", selection: "under", value: 47.5, kickoffTime: now - 3600000, status: "pending" },
            { gameId: "g3", league: "NFL", pickType: "spread", selection: "home_spread", value: -6.0, kickoffTime: now + 86400000, status: "pending" },
            { gameId: "g4", league: "CFB", pickType: "spread", selection: "away_spread", value: 10.5, kickoffTime: now + 86400000, status: "pending" },
            { gameId: "g5", league: "CFB", pickType: "total", selection: "over", value: 52.0, kickoffTime: now + 86400000, status: "pending" },
            { gameId: "g6", league: "CFB", pickType: "spread", selection: "home_spread", value: -3.5, kickoffTime: now + 86400000, status: "pending" }
          ]
        }
      ];

      for (const entry of testEntries) {
        await adminDb.collection("gridiron_3x3_entries").doc(entry.entryId).set(entry, { merge: true });
      }

      // Ensure snapshot lines exist with completed game results for g1 and g2
      const docId = `${seasonNum}_week_${weekNum.toString().padStart(2, '0')}`;
      const linesRef = adminDb.collection("gridiron_3x3_lines").doc(docId);
      const linesDoc = await linesRef.get();

      if (!linesDoc.exists) {
        await linesRef.set({
          season: seasonNum,
          weekNumber: weekNum,
          snapshotTimestamp: now - 86400000,
          games: [
            { gameId: "g1", league: "NFL", awayTeam: { name: "Miami Dolphins", abbreviation: "MIA", score: 20 }, homeTeam: { name: "Buffalo Bills", abbreviation: "BUF", score: 27 }, kickoffTime: now - 7200000, status: "final", spread: { awaySpread: 3.5, homeSpread: -3.5 }, total: { line: 48.5, over: -110, under: -110 } },
            { gameId: "g2", league: "NFL", awayTeam: { name: "Dallas Cowboys", abbreviation: "DAL", score: 28 }, homeTeam: { name: "Philadelphia Eagles", abbreviation: "PHI", score: 24 }, kickoffTime: now - 3600000, status: "final", spread: { awaySpread: 3.0, homeSpread: -3.0 }, total: { line: 47.5, over: -110, under: -110 } },
            { gameId: "g3", league: "NFL", awayTeam: { name: "Kansas City Chiefs", abbreviation: "KC" }, homeTeam: { name: "Denver Broncos", abbreviation: "DEN" }, kickoffTime: now + 86400000, status: "scheduled", spread: { awaySpread: 6.0, homeSpread: -6.0 }, total: { line: 45.0, over: -110, under: -110 } },
            { gameId: "g4", league: "CFB", awayTeam: { name: "Alabama Crimson Tide", abbreviation: "ALA" }, homeTeam: { name: "Georgia Bulldogs", abbreviation: "UGA" }, kickoffTime: now + 86400000, status: "scheduled", spread: { awaySpread: 10.5, homeSpread: -10.5 }, total: { line: 55.0, over: -110, under: -110 } },
            { gameId: "g5", league: "CFB", awayTeam: { name: "Ohio State Buckeyes", abbreviation: "OSU" }, homeTeam: { name: "Michigan Wolverines", abbreviation: "MICH" }, kickoffTime: now + 86400000, status: "scheduled", spread: { awaySpread: -3.5, homeSpread: 3.5 }, total: { line: 52.0, over: -110, under: -110 } },
            { gameId: "g6", league: "CFB", awayTeam: { name: "Texas Longhorns", abbreviation: "TEX" }, homeTeam: { name: "Oklahoma Sooners", abbreviation: "OU" }, kickoffTime: now + 86400000, status: "scheduled", spread: { awaySpread: 3.5, homeSpread: -3.5 }, total: { line: 58.0, over: -110, under: -110 } }
          ]
        }, { merge: true });
      }

      // Immediately grade completed games for Test 1
      await gradeGridironWeek(seasonNum, weekNum, { contestId: "test_1" });

      // Fetch graded entries
      const updatedSnap = await adminDb.collection("gridiron_3x3_entries")
        .where("contestId", "==", contestId || "test_1")
        .where("weekNumber", "==", weekNum)
        .get();
      if (!updatedSnap.empty) {
        entries = updatedSnap.docs.map(d => ({ entryId: d.id, ...(d.data() as GridironEntry) }));
      }
    }

    res.json({ success: true, entries });
  } catch (e: any) {
    console.error("Fetch Admin Gridiron 3x3 entries error:", e);
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

    res.json({ success: true, role });
  } catch (e: any) {
    console.error("Update role error:", e);
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
      matchup.manualWinnerId = manualWinnerId;
    }
    await gradePickemMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade
    res.json({ success: true });
  } catch (e: any) {
    console.error("Grade Pick 'Em matchup error:", e.message, e);
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
        
        // Validate newly added picks
        for (let i = currentPicks.length; i < sanitizedPicks.length; i++) {
            const newPick = sanitizedPicks[i];
            const mId = newPick.id.replace('pick-', '');
            const matchupRef = adminDb.collection('link4Matchups').doc(`${segmentId}_${mId}`);
            const mDoc = await transaction.get(matchupRef);
            if (!mDoc.exists) throw new Error("Invalid matchup selected.");
            const mData = mDoc.data();
            if (mData.status !== 'STATUS_SCHEDULED') throw new Error("Cannot pick a game that has already started.");
            if (mData.startTime && mData.startTime <= Date.now()) throw new Error("Matchup is locked.");
        }
        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        transaction.update(pickRef, {
          picks: sanitizedPicks,
          updatedAt: Date.now()
        });

      } else {
        // First pick, deduct fee
        const sanitizedPicks = picks.filter((p: any) => p !== null);
        // Validate newly added picks
        for (let i = 0; i < sanitizedPicks.length; i++) {
            const newPick = sanitizedPicks[i];
            const mId = newPick.id.replace('pick-', '');
            const matchupRef = adminDb.collection('link4Matchups').doc(`${segmentId}_${mId}`);
            const mDoc = await transaction.get(matchupRef);
            if (!mDoc.exists) throw new Error("Invalid matchup selected.");
            const mData = mDoc.data();
            if (mData.status !== 'STATUS_SCHEDULED') throw new Error("Cannot pick a game that has already started.");
            if (mData.startTime && mData.startTime <= Date.now()) throw new Error("Matchup is locked.");
        }

        if (currentLinks < cost) {
          throw new Error(`Not enough links. Link4 requires ${cost} links to enter.`);
        }

        if (sanitizedPicks.length === 0) {
            throw new Error("Must provide at least one pick to enter.");
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
      if (!matchup.active) throw new Error("Matchup is locked");
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
      if (!activePicks.empty) {
        throw new Error("You already have an active pick!");
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
        // Only allow lazy initialization for the default World Cup bracket
        if (bracketId === 'world-cup-2026') {
           bracketData = { cost: 10, totalPot: 0 };
        } else {
           throw new Error("Bracket not found or has not been fully initialized yet.");
        }
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

    if (target === 'ALL' || target === 'TENNIS' || target === 'ATP' || target === 'WTA') {
      tennisResult = await syncTennisOdds();
    }
    if (target === 'ALL' || target === 'SOCCER') {
      soccerResult = await syncSoccerOdds();
    }

    res.json({
      success: true,
      sport: sport || 'ALL',
      tennis: tennisResult,
      soccer: soccerResult,
    });
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

apiRouter.post("/admin/sync-schedules", validateAdminOrApiKey, async (req, res) => {
  try {
    let { league, scoreboardOnly } = req.body;
    // Default to false if not provided
    const isScoreboardOnly = !!scoreboardOnly;
    let result = {};
    
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
      const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
      const activeLeagues = activeLeaguesSnap.docs.map(doc => doc.id);
      
      let totalUpdated = 0;
      let totalCreated = 0;
      const errors = [];
      
      for (const activeLeague of activeLeagues) {
        if (activeLeague === 'PROP') {
           await updateAllProps();
        } else {
           try {
             const res = await syncLeagueSchedules(activeLeague, isScoreboardOnly);
             totalUpdated += res.matchupsUpdated || 0;
             totalCreated += res.scoreMatchupsCreated || 0;
           } catch (e) {
             errors.push(`${activeLeague}: ${e.message}`);
           }
        }
      }
      

      // Tennis odds are now synced on a 6-hour internal cron in oddsProcessor.ts
      
      result = { 
        success: true, 
        message: 'Synced all active leagues', 
        matchupsUpdated: totalUpdated, 
        scoreMatchupsCreated: totalCreated,
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
    res.json({ success: true, result });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
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
      if (!itemDoc.exists) throw new Error("Item not found");

      const item = itemDoc.data()!;
      if (!item.active) throw new Error("Item is no longer available");

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
      if (!item.active) throw new Error("Item is no longer available");
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
      transaction.set(ordersRef, {
        userId: uid,
        userEmail: profile.email || decodedToken.email || '',
        itemId: itemId,
        itemName: item.name,
        shippingInfo: shippingInfo,
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
      const inventory = profile.inventory || [];

      // If itemId is null, it means unequip
      if (itemId !== null && !inventory.includes(itemId)) {
        throw new Error("You do not own this item!");
      }

      const equippedCosmetics = profile.equippedCosmetics || {};

      const updateData: any = {
        updatedAt: Date.now(),
        equippedCosmetics: { ...equippedCosmetics, [type]: itemId }
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
    res.json({ success: true });
  } catch (e: any) {
    console.error("Grade matchup error:", e.message, e);
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
    
    // Trigger sync for SCRIPTLESS
    const result = await syncLeagueSchedules('SCRIPTLESS', false);
    
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
    
    return res.json({ success: true, result });
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

       let finalStartTime = startTime || Date.now();
       if ((league === 'PUTTING' || req.body.league === 'PUTTING') && !existingDoc.exists) {
         finalStartTime = Date.now() + 15 * 60 * 1000;
       } else if ((league === 'PUTTING' || req.body.league === 'PUTTING') && existingDoc.exists) {
         finalStartTime = existingData?.startTime || finalStartTime;
       }

       const isLocked = Date.now() >= finalStartTime;

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
         active: (league === 'DARTS' || league === 'PUTTING') ? !isLocked : (active !== undefined ? active : true),
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

    let finalStartTime = startTime || Date.now();
    if (league === 'PUTTING' && !existingDoc.exists) {
      finalStartTime = Date.now() + 15 * 60 * 1000;
    } else if (league === 'PUTTING' && existingDoc.exists) {
      finalStartTime = existingData?.startTime || finalStartTime;
    }

    const isLocked = Date.now() >= finalStartTime;

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
      active: (league === 'DARTS' || league === 'PUTTING') ? !isLocked : (active !== undefined ? active : true),
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

    res.json({ success: true, message: "Matchup synced successfully", matchup: matchupData });
  } catch (e: any) {
    console.error("External matchup sync error:", e);
    res.status(500).json({ error: e.message });
  }
});
apiRouter.post("/admin/monthly-rollover", validateAdmin, async (req, res) => {
  try {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const rolloverLockRef = adminDb!.collection('systemSettings').doc('monthlyRollover');
    
    let alreadyRun = false;
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

    await executeRollover(adminDb!, monthKey);
    res.json({ success: true, message: 'Monthly rollover completed successfully.' });
  } catch (error: any) {
    console.error("Monthly rollover error:", error);
    res.status(500).json({ success: false, error: error.message });
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

apiRouter.post("/admin/orders/update-status", validateAdmin, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: "Missing orderId or status" });
    }
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    await orderRef.update({
      status: status,
      updatedAt: Date.now()
    });

    res.json({ success: true, orderId, status });
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
    const { name, season, weekNumber, isPublic, logoUrl, primaryColor, secondaryColor } = req.body;

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

    await contestRef.set(contestData);

    // Initialize leaderboard entry for creator
    await updateGridironLeaderboard(contestRef.id);

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

    const contests = Array.from(contestMap.values());

    // Asynchronously trigger leaderboard calculation for all user contests (including test_1)
    for (const c of contests) {
      if (c.contestId) {
        updateGridironLeaderboard(c.contestId).catch(e => {
          console.warn(`[GridironContests] Leaderboard background refresh error for ${c.contestId}:`, e);
        });
      }
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

    const docId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
    let docSnap = await adminDb.collection("gridiron_3x3_lines").doc(docId).get();

    const lockTime = getGridironLinesLockTime(season, weekNumber);
    const now = Date.now();

    if (!docSnap.exists) {
      // Do not auto-generate snapshot lines for future weeks before Tuesday 12:00 PM EST odds finalization
      if (now < lockTime) {
        const lockDate = new Date(lockTime);
        const formattedLockDate = lockDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return res.json({
          success: true,
          lines: null,
          isLocked: true,
          lockTime,
          message: `Picks for Week ${weekNumber} open after Tuesday odds finalization on ${formattedLockDate}.`
        });
      }

      // Auto-trigger ingestion if snapshot lines document is missing and current time >= Tuesday 12:00 PM EST
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
    if (!participants.includes(uid)) {
      return res.status(403).json({ success: false, error: "Access denied. You are not a participant in this contest." });
    }

    // Grade week & refresh leaderboard for contest
    const season = contestDoc.data()?.season || 2026;
    try {
      await gradeGridironWeek(season, weekNum, { contestId });
      await updateGridironLeaderboard(contestId);
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
      const season = contestDoc.data()?.season || 2026;
      const docId = `${season}_week_${weekNum.toString().padStart(2, '0')}`;
      const snapshotSnap = await adminDb.collection("gridiron_3x3_weekly_snapshots").doc(docId).get();

      if (snapshotSnap.exists) {
        const snapshotEntries: GridironEntry[] = snapshotSnap.data()?.entries || [];
        rawEntries = snapshotEntries.filter(e => e.contestId === contestId);
      }
    }

    const now = Date.now();

    // BLIND REVEAL SECURITY: Mask competitor picks if kickoffTime > now
    const entries = rawEntries.map(data => {
      const isOwner = data.userId === uid;

      const maskedPicks = (data.picks || []).map(p => {
        const kickoffTimeMs = typeof p.kickoffTime === 'number'
          ? p.kickoffTime
          : (p.kickoffTime?.toMillis ? p.kickoffTime.toMillis() : new Date(p.kickoffTime).getTime());

        const isLocked = now >= kickoffTimeMs;

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

    res.json({ success: true, entries });
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
    if (gameIds.size !== 6 || picks.length !== 6) {
      return res.status(400).json({ success: false, error: "Entry must contain exactly 6 picks from 6 distinct games." });
    }

    // Verify participant in contest
    const contestDoc = await adminDb.collection("gridiron_3x3_contests").doc(contestId).get();
    if (!contestDoc.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }
    const participants: string[] = contestDoc.data()?.participants || [];
    if (!participants.includes(uid)) {
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
    const requiredCfb = Math.min(3, availableCfbCount);
    const requiredNfl = 6 - requiredCfb;

    const nflPicks = picks.filter((p: any) => p.league === "NFL");
    const cfbPicks = picks.filter((p: any) => p.league === "CFB");

    if (nflPicks.length !== requiredNfl || cfbPicks.length !== requiredCfb) {
      return res.status(400).json({ success: false, error: `Entry requires ${requiredNfl} NFL picks and ${requiredCfb} CFB picks.` });
    }

    const snapshotGamesMap = new Map<string, any>(
      snapshotGames.map((g: any) => [g.gameId, g])
    );

    const entryId = `${contestId}_${uid}_${weekNumber}`;
    const entryRef = adminDb.collection("gridiron_3x3_entries").doc(entryId);
    const existingEntryDoc = await entryRef.get();
    const existingPicksList: GridironPick[] = existingEntryDoc.exists ? (existingEntryDoc.data() as GridironEntry).picks || [] : [];

    const validatedPicks: GridironPick[] = [];

    for (const p of picks) {
      const snapGame = snapshotGamesMap.get(p.gameId);
      if (!snapGame) {
        return res.status(400).json({ success: false, error: `Game ${p.gameId} is not on the official Tuesday snapshot lines board.` });
      }

      const kickoffTimeMs = typeof snapGame.kickoffTime === 'number'
        ? snapGame.kickoffTime
        : (snapGame.kickoffTime?.toMillis ? snapGame.kickoffTime.toMillis() : new Date(snapGame.kickoffTime).getTime());

      // Derive authoritative value from DB snapshot
      let authoritativeValue = 0;
      if (p.selection === "away_spread") authoritativeValue = snapGame.spread.awaySpread;
      else if (p.selection === "home_spread") authoritativeValue = snapGame.spread.homeSpread;
      else if (p.selection === "over" || p.selection === "under") authoritativeValue = snapGame.total.line;
      else return res.status(400).json({ success: false, error: `Invalid selection type ${p.selection}` });

      // Rolling Kickoff Lock check against authoritative DB kickoffTime
      if (now >= kickoffTimeMs) {
        const existingPick = existingPicksList.find(ep => ep.gameId === p.gameId);
        if (!existingPick || existingPick.selection !== p.selection || existingPick.value !== authoritativeValue) {
          return res.status(400).json({ success: false, error: `Game ${snapGame.awayTeam.name} @ ${snapGame.homeTeam.name} has already kicked off and cannot be picked or modified.` });
        }
      }

      validatedPicks.push({
        gameId: snapGame.gameId,
        league: snapGame.league,
        pickType: (p.selection === "away_spread" || p.selection === "home_spread") ? "spread" : "total",
        selection: p.selection,
        value: authoritativeValue,
        kickoffTime: kickoffTimeMs,
        status: "pending"
      });
    }

    const userDoc = await adminDb.collection("users").doc(uid).get();
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
    const { contestId, name, isPublic, logoUrl, primaryColor, secondaryColor, season, weekNumber } = req.body;

    if (!contestId) {
      return res.status(400).json({ success: false, error: "contestId is required." });
    }

    const contestRef = adminDb.collection("gridiron_3x3_contests").doc(contestId);
    const docSnap = await contestRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }

    const updateData: any = {};
    if (name && typeof name === 'string') updateData.name = name.trim();
    if (isPublic !== undefined) updateData.isPublic = !!isPublic;
    if (logoUrl !== undefined) updateData.logoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : null;
    if (primaryColor !== undefined) updateData.primaryColor = typeof primaryColor === 'string' ? primaryColor.trim() : null;
    if (secondaryColor !== undefined) updateData.secondaryColor = typeof secondaryColor === 'string' ? secondaryColor.trim() : null;
    if (typeof season === 'number') updateData.season = season;
    if (typeof weekNumber === 'number') updateData.weekNumber = weekNumber;

    await contestRef.update(updateData);
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

apiRouter.get("/link4/matchups/:segmentId", async (req, res) => {
  try {
    const { segmentId } = req.params;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });
    const snap = await adminDb.collection('link4Matchups').where('segmentId', '==', segmentId).get();
    const matchups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, matchups });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
