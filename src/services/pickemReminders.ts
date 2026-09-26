import { adminDb } from '../lib/firebase-admin.js';
import { getCurrentFootballWeek } from '../utils/footballWeek.js';

let reminderInterval: NodeJS.Timeout | null = null;

export function getReminderDayInfo(nowDate = new Date()) {
  const nyDateStr = nowDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDate = new Date(nyDateStr);
  const dayOfWeek = nyDate.getDay(); // 0 = Sunday, 1 = Mon, ..., 4 = Thursday, 6 = Saturday

  const isThursday = dayOfWeek === 4;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  let dayLabel = '';
  if (isThursday) dayLabel = 'thu';
  else if (isSaturday) dayLabel = 'sat';
  else if (isSunday) dayLabel = 'sun';

  return { dayOfWeek, isThursday, isSaturday, isSunday, dayLabel };
}

export function hasGamesOnDay(matchupDocs: any[], targetDay: number, leagueFilter?: string): boolean {
  return matchupDocs.some(m => {
    const data = typeof m.data === 'function' ? m.data() : m;
    if (!data.startTime) return false;
    const gameNyDate = new Date(new Date(data.startTime).toLocaleString('en-US', { timeZone: 'America/New_York' }));
    if (gameNyDate.getDay() !== targetDay) return false;
    if (leagueFilter && data.league && data.league.toUpperCase() !== leagueFilter.toUpperCase()) {
      return false;
    }
    return true;
  });
}

export async function processPickemCampaignReminders(now: number, dayInfo: ReturnType<typeof getReminderDayInfo>) {
  if (!adminDb) return;
  const twelveHoursMs = 12 * 60 * 60 * 1000;

  const campaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();

  for (const campaignDoc of campaignsSnap.docs) {
    const campaign = campaignDoc.data();
    if (campaign.currentWeek === undefined || campaign.currentWeek === null) continue;

    const matchupsSnap = await adminDb.collection('pickemMatchups')
      .where('campaignId', '==', campaignDoc.id)
      .where('week', '==', campaign.currentWeek)
      .get();
    const matchupDocs = matchupsSnap.docs;
    if (matchupDocs.length === 0) continue;

    let earliestStart = Infinity;
    matchupDocs.forEach(m => {
      const mData = m.data();
      if (mData.startTime && mData.startTime < earliestStart) earliestStart = mData.startTime;
    });
    if (earliestStart === Infinity) continue;

    const timeUntilLock = earliestStart - now;
    const isLockWindow = timeUntilLock > 0 && timeUntilLock <= twelveHoursMs && timeUntilLock > (twelveHoursMs - 60 * 60 * 1000);

    let isScheduledDayTrigger = false;
    let dayTag = '';

    if (dayInfo.isThursday && hasGamesOnDay(matchupDocs, 4)) {
      isScheduledDayTrigger = true;
      dayTag = 'thu';
    } else if (dayInfo.isSaturday && (hasGamesOnDay(matchupDocs, 6, 'CFB') || hasGamesOnDay(matchupDocs, 6))) {
      isScheduledDayTrigger = true;
      dayTag = 'sat';
    } else if (dayInfo.isSunday && (hasGamesOnDay(matchupDocs, 0, 'NFL') || hasGamesOnDay(matchupDocs, 0))) {
      isScheduledDayTrigger = true;
      dayTag = 'sun';
    }

    if (!isLockWindow && !isScheduledDayTrigger) continue;

    const participantsSnap = await adminDb.collection('pickemParticipants')
      .where('campaignId', '==', campaignDoc.id)
      .get();
    if (participantsSnap.empty) continue;

    const picksSnap = await adminDb.collection('pickemPicks')
      .where('campaignId', '==', campaignDoc.id)
      .where('week', '==', campaign.currentWeek)
      .get();

    const pickCountByParticipant = new Map<string, number>();
    picksSnap.docs.forEach(pDoc => {
      const pData = pDoc.data();
      const pId = pData.participantId || pData.userId;
      if (pId && pData.pick?.teamId) {
        pickCountByParticipant.set(pId, (pickCountByParticipant.get(pId) || 0) + 1);
      }
    });

    const triggerTag = dayTag ? `_${dayTag}` : '';
    const prefix = `pickem_remind_${campaignDoc.id}_w${campaign.currentWeek}${triggerTag}_`;
    const notifSnap = await adminDb.collection('notifications')
      .where('dedupeId', '>=', prefix)
      .where('dedupeId', '<=', prefix + '\uf8ff')
      .get();
    const sentUserIds = new Set(notifSnap.docs.map(d => d.data().userId || d.data().targetUserId));

    let expectedLimit = campaign.pickLimit;
    if (campaign.format === 'SURVIVOR') expectedLimit = 1;
    if (!expectedLimit || expectedLimit <= 0) expectedLimit = matchupDocs.length;

    let notifBatch = adminDb.batch();
    let notifOpCount = 0;

    for (const pDoc of participantsSnap.docs) {
      const pData = pDoc.data();
      const pId = pData.participantId || pData.userId;
      if (!pId || sentUserIds.has(pId)) continue;

      const userPickCount = pickCountByParticipant.get(pId) || 0;
      if (userPickCount < expectedLimit) {
        const missing = expectedLimit - userPickCount;
        const dedupeId = `${prefix}${pId}`;
        const notifRef = adminDb.collection('notifications').doc();

        const dayName = dayTag === 'thu' ? 'Thursday' : (dayTag === 'sat' ? 'Saturday' : (dayTag === 'sun' ? 'Sunday' : 'Upcoming'));

        notifBatch.set(notifRef, {
          userId: pId,
          targetUserId: pId,
          status: 'PENDING',
          audience: 'USER',
          title: `Missing Picks: ${campaign.theme?.title || campaign.name}`,
          message: `${dayName} Pick 'Em Reminder: You still have ${missing} pick${missing > 1 ? 's' : ''} to make for Week ${campaign.currentWeek}! Games start soon.`,
          link: `/pickem/${campaignDoc.id}`,
          read: false,
          createdAt: Date.now(),
          dedupeId: dedupeId
        });
        notifOpCount++;

        if (notifOpCount >= 450) {
          await notifBatch.commit();
          notifBatch = adminDb.batch();
          notifOpCount = 0;
        }
      }
    }

    if (notifOpCount > 0) {
      await notifBatch.commit();
    }
  }
}

export async function processGridironReminders(now: number, dayInfo: ReturnType<typeof getReminderDayInfo>) {
  if (!adminDb) return;

  const footballWeek = getCurrentFootballWeek(new Date(now));
  const weekNumber = footballWeek.weekNumber;
  const season = footballWeek.season;

  if (!dayInfo.isThursday && !dayInfo.isSaturday && !dayInfo.isSunday) {
    return;
  }

  const dayTag = dayInfo.dayLabel;

  const linesDocId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
  const linesSnap = await adminDb.collection('gridiron_3x3_lines').doc(linesDocId).get();
  if (!linesSnap.exists) return;

  const snapshotGames = linesSnap.data()?.games || [];
  if (snapshotGames.length === 0) return;

  let dayHasGames = false;
  if (dayInfo.isThursday) dayHasGames = hasGamesOnDay(snapshotGames, 4);
  else if (dayInfo.isSaturday) dayHasGames = hasGamesOnDay(snapshotGames, 6, 'CFB') || hasGamesOnDay(snapshotGames, 6);
  else if (dayInfo.isSunday) dayHasGames = hasGamesOnDay(snapshotGames, 0, 'NFL') || hasGamesOnDay(snapshotGames, 0);

  if (!dayHasGames) return;

  const contestsSnap = await adminDb.collection('gridiron_3x3_contests').get();

  for (const contestDoc of contestsSnap.docs) {
    const contest = contestDoc.data();
    const contestId = contestDoc.id;
    const participants: string[] = contest.participants || [];

    if (participants.length === 0) continue;

    const prefix = `gridiron_3x3_remind_${contestId}_w${weekNumber}_${dayTag}_`;
    const notifSnap = await adminDb.collection('notifications')
      .where('dedupeId', '>=', prefix)
      .where('dedupeId', '<=', prefix + '\uf8ff')
      .get();
    const sentUserIds = new Set(notifSnap.docs.map(d => d.data().userId || d.data().targetUserId));

    let notifBatch = adminDb.batch();
    let notifOpCount = 0;

    for (const uid of participants) {
      if (sentUserIds.has(uid)) continue;

      const entryId = `${contestId}_${uid}_${weekNumber}`;
      const entrySnap = await adminDb.collection('gridiron_3x3_entries').doc(entryId).get();
      const userPicks = entrySnap.exists ? (entrySnap.data()?.picks || []) : [];

      if (userPicks.length < 6) {
        const missing = 6 - userPicks.length;
        const dedupeId = `${prefix}${uid}`;
        const notifRef = adminDb.collection('notifications').doc();

        const dayName = dayTag === 'thu' ? 'Thursday' : (dayTag === 'sat' ? 'Saturday' : 'Sunday');

        notifBatch.set(notifRef, {
          userId: uid,
          targetUserId: uid,
          status: 'PENDING',
          audience: 'USER',
          title: `Gridiron 3x3 Reminder: ${contest.name || 'Contest Group'}`,
          message: `${dayName} Gridiron 3x3 Reminder: You still have ${missing} pick${missing > 1 ? 's' : ''} left for Week ${weekNumber}! Submit your picks before kickoff.`,
          link: `/gridiron`,
          read: false,
          createdAt: Date.now(),
          dedupeId: dedupeId
        });
        notifOpCount++;

        if (notifOpCount >= 450) {
          await notifBatch.commit();
          notifBatch = adminDb.batch();
          notifOpCount = 0;
        }
      }
    }

    if (notifOpCount > 0) {
      await notifBatch.commit();
    }
  }
}

export function startPickemRemindersJob() {
  if (reminderInterval) return;

  const runReminders = async () => {
    if (!adminDb) return;
    try {
      console.log("[PickemReminders] Checking for missing picks...");
      const now = Date.now();
      const dayInfo = getReminderDayInfo(new Date(now));
      await processPickemCampaignReminders(now, dayInfo);
      await processGridironReminders(now, dayInfo);
    } catch (e) {
      console.error("[PickemReminders] Error:", e);
    }
  };
  
  // Run every hour
  runReminders();
  reminderInterval = setInterval(runReminders, 60 * 60 * 1000);
}
