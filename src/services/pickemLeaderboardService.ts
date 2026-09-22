import * as firebaseAdmin from '../lib/firebase-admin.js';
import { gradeSinglePickemMatchup } from './pickemGrader.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

interface LeaderboardParticipant {
  uid: string;
  rank: number;
  username: string;
  displayName: string;
  avatar: string;
  points: number;
  wins: number;
  losses: number;
  pushes: number;
  totalPicks: number;
  winPct: string;
  tbValue?: number;
  tbDisplay?: any;
  picks?: any[];
}

interface CampaignLeaderboardDoc {
  campaignId: string;
  campaignName: string;
  currentWeek: number;
  totalParticipants: number;
  updatedAt: number;
  season: LeaderboardParticipant[];
  weeks: Record<number, LeaderboardParticipant[]>;
}

const memoryCache = new Map<string, { doc: CampaignLeaderboardDoc; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Normalizes all campaign ID aliases (e.g. YES Day walk for autism aliases)
 */
export async function getCampaignAliases(campaignId: string): Promise<{ canonicalId: string; aliases: string[]; campaignData: any }> {
  const adminDb = getAdminDb();
  if (!adminDb) return { canonicalId: campaignId, aliases: [campaignId], campaignData: null };

  const aliases = new Set<string>();
  aliases.add(campaignId);

  let canonicalId = campaignId;
  let campaignData: any = null;

  // Try direct fetch
  try {
    const directDoc = await adminDb.collection('pickemCampaigns').doc(campaignId).get();
    if (directDoc.exists) {
      campaignData = { id: directDoc.id, ...directDoc.data() };
      canonicalId = directDoc.id;
    }
  } catch (e) {
    console.warn(`[LeaderboardService] Error fetching campaign doc ${campaignId}:`, e);
  }

  // If not found or if YES Day, look up by name or known aliases
  const isYesDayInput =
    campaignId === 'charity' ||
    campaignId === 'yes_day_2026' ||
    campaignId.toLowerCase().includes('yes day') ||
    campaignData?.name === 'YES Day Walk for Autism 2026' ||
    campaignData?.isCharity;

  if (isYesDayInput || !campaignData) {
    try {
      const allCamps = await adminDb.collection('pickemCampaigns').get();
      allCamps.docs.forEach((d: any) => {
        const data = d.data();
        const isYes =
          d.id === 'aUqhDhT3vKWfkPgSAVzf' ||
          data.name === 'YES Day Walk for Autism 2026' ||
          data.isCharity ||
          d.id === 'charity' ||
          d.id === 'yes_day_2026';

        if (isYesDayInput && isYes) {
          canonicalId = d.id;
          campaignData = { id: d.id, ...data };
          aliases.add(d.id);
          aliases.add('aUqhDhT3vKWfkPgSAVzf');
          aliases.add('yes_day_2026');
          aliases.add('charity');
          aliases.add('YES Day Walk for Autism 2026');
        } else if (!campaignData && (d.id === campaignId || data.name === campaignId || data.joinCode === campaignId)) {
          canonicalId = d.id;
          campaignData = { id: d.id, ...data };
          aliases.add(d.id);
          if (data.name) aliases.add(data.name);
        }
      });
    } catch (e) {
      console.warn('[LeaderboardService] Error scanning all campaigns:', e);
    }
  }

  if (campaignData?.name) {
    aliases.add(campaignData.name);
  }

  return { canonicalId, aliases: Array.from(aliases), campaignData };
}

/**
 * Computes the full static leaderboard and persists it into Firestore `pickemLeaderboards/{id}`
 */
export async function generateAndSavePickemLeaderboard(campaignId: string): Promise<CampaignLeaderboardDoc> {
  const adminDb = getAdminDb();
  if (!adminDb) {
    throw new Error('Firestore admin database is not initialized');
  }

  const { canonicalId, aliases, campaignData } = await getCampaignAliases(campaignId);
  const campName = campaignData?.theme?.title || campaignData?.name || 'Pick\'em Contest';
  const currentWeek = campaignData?.currentWeek ?? 1;

  // Pre-grade all completed matchups across all campaign aliases before calculating standings
  try {
    const completedMatchupSnaps = await Promise.all(
      aliases.map(cid =>
        adminDb.collection('pickemMatchups')
          .where('campaignId', '==', cid)
          .where('status', 'in', ['STATUS_FINAL', 'STATUS_POSTPONED'])
          .get()
          .catch(() => ({ docs: [] } as any))
      )
    );

    const completedMatchupsMap = new Map<string, any>();
    completedMatchupSnaps.forEach(snap => {
      snap.docs.forEach((d: any) => {
        completedMatchupsMap.set(d.id, { id: d.id, ...d.data() });
      });
    });

    for (const matchup of completedMatchupsMap.values()) {
      await gradeSinglePickemMatchup(matchup);
    }
  } catch (gradeErr) {
    console.warn('[LeaderboardService] Error pre-grading completed matchups:', gradeErr);
  }

  // 1. Gather all participants across all aliases
  const partSnaps = await Promise.all(
    aliases.map(cid =>
      adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get().catch(() => ({ docs: [] } as any))
    )
  );

  const participantIds = new Set<string>();
  partSnaps.forEach(snap => {
    snap.docs.forEach((d: any) => {
      const data = d.data();
      const uid = data.participantId || data.userId;
      if (uid) participantIds.add(uid);
    });
  });

  // 2. Gather all picks across all aliases
  const pickSnaps = await Promise.all(
    aliases.map(cid =>
      adminDb.collection('pickemPicks').where('campaignId', '==', cid).get().catch(() => ({ docs: [] } as any))
    )
  );

  const allPicks: any[] = [];
  const processedPickIds = new Set<string>();
  pickSnaps.forEach(snap => {
    snap.docs.forEach((d: any) => {
      if (processedPickIds.has(d.id)) return;
      processedPickIds.add(d.id);
      const data = d.data();
      const pick = { id: d.id, ...data };
      allPicks.push(pick);

      const uid = data.participantId || data.userId;
      if (uid) participantIds.add(uid);
    });
  });

  // 3. Gather all matchups across all aliases
  const matchupSnaps = await Promise.all(
    aliases.map(cid =>
      adminDb.collection('pickemMatchups').where('campaignId', '==', cid).get().catch(() => ({ docs: [] } as any))
    )
  );
  const matchupsMap = new Map<string, any>();
  matchupSnaps.forEach(snap => {
    snap.docs.forEach((d: any) => {
      matchupsMap.set(d.id, { id: d.id, ...d.data() });
    });
  });

  const uids = Array.from(participantIds);

  // 4. Batch fetch user profiles for display names and avatars
  const usersMap: Record<string, any> = {};
  for (let i = 0; i < uids.length; i += 50) {
    const chunk = uids.slice(i, i + 50);
    const refs = chunk.map(uid => adminDb.collection('users').doc(uid));
    try {
      const snaps = await adminDb.getAll(...refs);
      snaps.forEach((d: any) => {
        if (d.exists) {
          usersMap[d.id] = d.data();
        }
      });
    } catch (e) {
      console.warn('[LeaderboardService] Error batch fetching user profiles:', e);
    }
  }

  // 5. Build user aggregations
  const stats: Record<string, {
    uid: string;
    username: string;
    displayName: string;
    avatar: string;
    points: number;
    wins: number;
    losses: number;
    pushes: number;
    totalPicks: number;
    tbValue: number;
    weekly: Record<number, {
      points: number;
      wins: number;
      losses: number;
      pushes: number;
      totalPicks: number;
      tbValue: number;
      tbDisplay: any;
      picks: any[];
    }>;
  }> = {};

  uids.forEach(uid => {
    const u = usersMap[uid];
    const username = u?.username || u?.displayName || u?.name || `Player_${uid.slice(0, 5)}`;
    const displayName = u?.displayName || u?.username || u?.name || `Player_${uid.slice(0, 5)}`;
    const avatar = u?.image || u?.avatarUrl || u?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

    stats[uid] = {
      uid,
      username,
      displayName,
      avatar,
      points: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalPicks: 0,
      tbValue: 0,
      weekly: {}
    };
  });

  // Aggregate picks
  allPicks.forEach(p => {
    const uid = p.participantId || p.userId;
    if (!uid || !stats[uid]) return;

    const week = p.week ?? 1;
    if (!stats[uid].weekly[week]) {
      stats[uid].weekly[week] = {
        points: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        totalPicks: 0,
        tbValue: 0,
        tbDisplay: '-',
        picks: []
      };
    }

    stats[uid].totalPicks += 1;
    stats[uid].weekly[week].totalPicks += 1;

    const pointsEarned = p.pointsEarned !== undefined && p.pointsEarned !== null ? Number(p.pointsEarned) : (p.status === 'WIN' ? 1 : 0);

    const m = matchupsMap.get(p.matchupId);
    let teamImage = '';
    let teamName = '';
    const teamId = p.pick?.teamId || p.pick;
    const isLocked = m ? (m.status !== 'STATUS_SCHEDULED' || (!!m.startTime && Date.now() >= m.startTime)) : false;

    if (m) {
      if (m.type === 'OVER_UNDER') {
        teamImage = teamId === 'OVER' ? '/images/over.png' : '/images/under.png';
        teamName = teamId;
      } else {
        teamImage = teamId === m.awayTeam?.id ? (m.awayTeam?.image || '') : (m.homeTeam?.image || '');
        teamName = teamId === m.awayTeam?.id ? (m.awayTeam?.name || teamId) : (m.homeTeam?.name || teamId);
      }
    }

    const pickInfo = {
      id: p.id,
      matchupId: p.matchupId,
      teamId,
      teamName,
      teamImage,
      matchupType: m?.type || 'STANDARD',
      isRevealed: isLocked,
      pick: p.pick || { teamId },
      week,
      status: p.status || 'PENDING',
      pointsEarned,
      confidence: p.confidence || null,
      tiebreakerTotal: p.tiebreakerTotal || null
    };

    stats[uid].weekly[week].picks.push(pickInfo);

    if (p.status === 'WIN') {
      stats[uid].wins += 1;
      stats[uid].points += pointsEarned;
      stats[uid].weekly[week].wins += 1;
      stats[uid].weekly[week].points += pointsEarned;
    } else if (p.status === 'LOSS') {
      stats[uid].losses += 1;
      stats[uid].weekly[week].losses += 1;
    } else if (p.status === 'PUSH') {
      stats[uid].pushes += 1;
      stats[uid].weekly[week].pushes += 1;
    }
  });

  // Format Season Standings
  const sortedSeason = Object.values(stats)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.username.localeCompare(b.username);
    })
    .map((s, idx) => {
      const totalDecided = s.wins + s.losses;
      const winPct = totalDecided > 0 ? ((s.wins / totalDecided) * 100).toFixed(1) + '%' : '0.0%';
      const allUserPicks: any[] = [];
      Object.values(s.weekly).forEach((w: any) => {
        if (Array.isArray(w.picks)) allUserPicks.push(...w.picks);
      });
      return {
        id: s.uid,
        uid: s.uid,
        rank: idx + 1,
        name: s.displayName || s.username,
        username: s.username,
        displayName: s.displayName,
        avatar: s.avatar,
        points: s.points,
        wins: s.wins,
        losses: s.losses,
        pushes: s.pushes,
        totalPicks: s.totalPicks,
        winPct,
        picks: allUserPicks
      };
    });

  // Format Weekly Standings
  const allWeeks = new Set<number>();
  allWeeks.add(currentWeek);
  matchupsMap.forEach(m => {
    if (m.week !== undefined && m.week !== null) allWeeks.add(m.week);
  });
  allPicks.forEach(p => {
    if (p.week !== undefined && p.week !== null) allWeeks.add(p.week);
  });

  const weeklyRecord: Record<number, LeaderboardParticipant[]> = {};

  Array.from(allWeeks).sort((a, b) => a - b).forEach(w => {
    const weekSorted = Object.values(stats)
      .map(s => {
        const wStat = s.weekly[w] || {
          points: 0,
          wins: 0,
          losses: 0,
          pushes: 0,
          totalPicks: 0,
          tbValue: 0,
          tbDisplay: '-',
          picks: []
        };
        const totalDecided = wStat.wins + wStat.losses;
        const winPct = totalDecided > 0 ? ((wStat.wins / totalDecided) * 100).toFixed(1) + '%' : '0.0%';

        return {
          id: s.uid,
          uid: s.uid,
          rank: 1,
          name: s.displayName || s.username,
          username: s.username,
          displayName: s.displayName,
          avatar: s.avatar,
          points: wStat.points,
          wins: wStat.wins,
          losses: wStat.losses,
          pushes: wStat.pushes,
          totalPicks: wStat.totalPicks,
          winPct,
          picks: wStat.picks
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.username.localeCompare(b.username);
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    weeklyRecord[w] = weekSorted;
  });

  const leaderboardDoc: CampaignLeaderboardDoc = {
    campaignId: canonicalId,
    campaignName: campName,
    currentWeek,
    totalParticipants: uids.length,
    updatedAt: Date.now(),
    season: sortedSeason,
    weeks: weeklyRecord
  };

  // Strip undefined values before persisting to Firestore
  const cleanDoc = JSON.parse(JSON.stringify(leaderboardDoc));

  // Write static document to Firestore pickemLeaderboards collection for canonical ID and clean slug aliases
  try {
    const validSlugs = new Set<string>();
    validSlugs.add(canonicalId);
    aliases.forEach(a => {
      // Only persist clean alphanumeric slug identifiers, never raw strings with spaces or test
      if (!a.includes(' ') && a.length > 0 && a !== 'test') {
        validSlugs.add(a);
      }
    });

    await Promise.all(
      Array.from(validSlugs).map(targetId =>
        adminDb.collection('pickemLeaderboards').doc(targetId).set(cleanDoc)
      )
    );
  } catch (e) {
    console.error('[LeaderboardService] Failed to persist static leaderboard to Firestore:', e);
  }

  // Update memory cache
  aliases.forEach(alias => {
    memoryCache.set(alias, { doc: leaderboardDoc, timestamp: Date.now() });
  });
  memoryCache.set(canonicalId, { doc: leaderboardDoc, timestamp: Date.now() });

  return leaderboardDoc;
}

/**
 * Retrieves the static leaderboard document with fast memory cache and Firestore fallback
 */
export async function getStaticPickemLeaderboard(campaignId: string, forceRefresh = false): Promise<CampaignLeaderboardDoc> {
  const adminDb = getAdminDb();
  const { canonicalId } = await getCampaignAliases(campaignId);

  // Check in-memory cache
  if (!forceRefresh) {
    const cached = memoryCache.get(canonicalId) || memoryCache.get(campaignId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.doc;
    }
  }

  // Check Firestore static document
  if (!forceRefresh && adminDb) {
    try {
      const docSnap = await adminDb.collection('pickemLeaderboards').doc(canonicalId).get();
      if (docSnap.exists) {
        const data = docSnap.data() as CampaignLeaderboardDoc;
        memoryCache.set(canonicalId, { doc: data, timestamp: Date.now() });
        memoryCache.set(campaignId, { doc: data, timestamp: Date.now() });
        return data;
      }
    } catch (e) {
      console.warn(`[LeaderboardService] Error reading static leaderboard for ${canonicalId}:`, e);
    }
  }

  // Generate fresh, save, and return
  return await generateAndSavePickemLeaderboard(canonicalId);
}
