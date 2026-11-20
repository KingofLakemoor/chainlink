import { Router, Request, Response } from 'express';
import { Firestore } from 'firebase-admin/firestore';

export interface SpokeRouterDependencies {
  adminDb: Firestore | null;
  syncLeagueSchedules: (league: string, isManual?: boolean) => Promise<any>;
  updateAllProps: () => Promise<any>;
  processPendingNotifications: () => Promise<any>;
  getMatchupStartTime: (rawTime: any) => number;
  gradeMatchups: (matchups: any[]) => Promise<any>;
  gradeLink4Matchups: (matchups: any[]) => Promise<any>;
  invalidateMatchupCaches: () => void;
}

/**
 * Creates the Club 602 spoke integration router.
 * Encapsulates proprietary spoke webhooks and partner API endpoints:
 * - POST /webhooks/scriptless: ScriptLess fantasy reality TV prediction sync trigger
 * - POST /webhooks/putting: Grassroots putting league live score/matchup ingest
 * - GET  /chainlink/matchups: Partner endpoint for querying active ChainLink matchups
 * - GET  /external/check-premium: Cross-spoke subscriber tier resolution
 */
export function createClub602SpokeRouter(deps: SpokeRouterDependencies): Router {
  const router = Router();
  const {
    adminDb,
    syncLeagueSchedules,
    updateAllProps,
    processPendingNotifications,
    getMatchupStartTime,
    gradeMatchups,
    gradeLink4Matchups,
    invalidateMatchupCaches
  } = deps;

  const validateApiKey = (req: Request, res: Response): boolean => {
    const providedApiKey = req.headers['x-api-key'];
    const expectedKey = process.env.SCRIPTLESS_API_KEY;
    if (!expectedKey || !providedApiKey || providedApiKey !== expectedKey) {
      res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
      return false;
    }
    return true;
  };

  // POST /webhooks/scriptless
  router.post("/webhooks/scriptless", async (req: Request, res: Response) => {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
    if (!validateApiKey(req, res)) return;

    try {
      console.log("[Club602 Spokes] Received ScriptLess webhook. Body:", req.body);

      // Trigger sync for SCRIPTLESS
      const result = await syncLeagueSchedules('SCRIPTLESS', false);

      // Update props in case a matchup finalized
      try {
        await updateAllProps();
      } catch (err) {
        console.error('[Club602 Spokes] Failed to update props during scriptless webhook:', err);
      }

      // Process notifications
      try {
        await processPendingNotifications();
      } catch (err) {
        console.error('[Club602 Spokes] Failed to process notifications during scriptless webhook:', err);
      }

      return res.json({ success: true, result });
    } catch (e: any) {
      console.error("[Club602 Spokes] ScriptLess webhook error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /webhooks/putting
  router.post("/webhooks/putting", async (req: Request, res: Response) => {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
    if (!validateApiKey(req, res)) return;

    try {
      console.log("[Club602 Spokes] Received PUTTING webhook. Body:", req.body);

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
          console.error('[Club602 Spokes] Failed to update props/notifications during putting webhook:', err);
        }

        return res.json({ success: true, message: "Putting Matchup webhook processed", matchup: matchupData });
      }

      return res.json({ success: true, message: "Webhook received" });
    } catch (e: any) {
      console.error("[Club602 Spokes] PUTTING webhook error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /chainlink/matchups
  router.get("/chainlink/matchups", async (req: Request, res: Response) => {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
    if (!validateApiKey(req, res)) return;

    try {
      const snap = await adminDb.collection('matchups').where('active', '==', true).get();
      const matchups = snap.docs.map(doc => doc.data());

      return res.json({ success: true, matchups });
    } catch (e: any) {
      console.error("[Club602 Spokes] External get matchups error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /external/check-premium
  router.get("/external/check-premium", async (req: Request, res: Response) => {
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
    if (!validateApiKey(req, res)) return;

    try {
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
      console.error("[Club602 Spokes] External check-premium error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}
