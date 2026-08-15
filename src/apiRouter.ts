import { executeRollover } from './services/monthlyRollover.js';
import { processPendingNotifications } from './services/notificationProcessor.js';
import { gradeBrackets } from './services/bracketGrader.js';
import express from 'express';
import { adminAuth, adminDb, adminMessaging } from './lib/firebase-admin.js';
import { scrapeLeagueSchedules, syncLeagueSchedules } from './services/scheduleProcessor.js';
import { gradeMatchups } from './services/grader.js';
import { gradeLink4Matchups, payoutLink4Segment } from './services/link4Grader.js';
import { gradePickemMatchups } from './services/pickemGrader.js';
import { updateAllProps } from './services/propGrader.js';
import { autoGenerateNFLProps } from './services/propGenerator.js';
import { syncTennisOdds } from './services/oddsProcessor.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia' as any, // Cast to any to bypass TS error for newer stripe versions
});

export const apiRouter = express.Router();



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
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.json({ exists: false });
    }
    const snap = await adminDb.collection('users').where('usernameLower', '==', username.toLowerCase()).limit(1).get();
    return res.json({ exists: !snap.empty });
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

        // Only store non-null picks
        const sanitizedPicks = picks.filter((p: any) => p !== null);

        transaction.update(pickRef, {
          picks: sanitizedPicks,
          updatedAt: Date.now()
        });

      } else {
        // First pick, deduct fee
        if (currentLinks < cost) {
          throw new Error(`Not enough links. Link4 requires ${cost} links to enter.`);
        }

        const sanitizedPicks = picks.filter((p: any) => p !== null);
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
    const result = await syncTennisOdds();
    res.json(result);
  } catch (err) {
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

let chainsCache: any = null;
let chainsCacheTime = 0;

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
