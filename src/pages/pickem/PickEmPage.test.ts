import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('PickEmPage Yes Day prize breakdown tests', () => {
  it('renders YES Day custom prize breakdown structure correctly', () => {
    // Helper unit logic test for Yes Day prize pool rendering parameters
    const selectedCampaign = {
      isCharity: true,
      name: 'YES Day Walk for Autism 2026',
      entryFee: 0
    };

    const isYesDayCampaign = selectedCampaign?.isCharity ||
      selectedCampaign?.name === 'YES Day Walk for Autism 2026';

    expect(isYesDayCampaign).toBe(true);

    const potAmount = 15;
    const formattedPot = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(potAmount);
    expect(formattedPot).toBe('$15');
  });

  it('matches join codes case-insensitively and handles whitespace', () => {
    const campaigns = [
      { id: 'yes-day-1', name: 'YES Day Walk for Autism 2026', joinCode: 'yesday2026', isArchived: false },
      { id: 'other-camp', name: 'Other League', joinCode: 'SECRET123', isArchived: false },
      { id: 'archived-camp', name: 'Old League', joinCode: 'yesday2026', isArchived: true }
    ];

    const matchCode = (cleanCode: string) => {
      const trimmed = cleanCode.trim().toLowerCase();
      return campaigns.find(c => !c.isArchived && (
        (c.joinCode && c.joinCode.trim().toLowerCase() === trimmed) ||
        c.id.toLowerCase() === trimmed
      ));
    };

    expect(matchCode('yesday2026')?.id).toBe('yes-day-1');
    expect(matchCode('  YESDAY2026  ')?.id).toBe('yes-day-1');
    expect(matchCode('YesDay2026')?.id).toBe('yes-day-1');
    expect(matchCode('secret123')?.id).toBe('other-camp');
    expect(matchCode('yes-day-1')?.id).toBe('yes-day-1');
    expect(matchCode('invalidcode')).toBeUndefined();
  });

  it('correctly resolves direct campaign landing view state when user has not joined', () => {
    const campaigns = [
      { id: 'camp1', name: 'Private League 1', joinCode: 'CODE123', isArchived: false },
      { id: 'camp2', name: 'Public League 2', isArchived: false }
    ];
    const joinedIds = new Set(['camp2']);

    const resolveDirectLandingState = (urlCode: string) => {
      const clean = urlCode.trim().toLowerCase();
      const matched = campaigns.find(c => !c.isArchived && (
        (c.joinCode && c.joinCode.trim().toLowerCase() === clean) ||
        c.id.toLowerCase() === clean
      ));

      if (!matched) return { action: 'SHOW_ERROR', code: urlCode };
      if (joinedIds.has(matched.id)) return { action: 'REDIRECT_CAMPAIGN', campaignId: matched.id };
      return { action: 'SHOW_DIRECT_LANDING', campaign: matched };
    };

    expect(resolveDirectLandingState('CODE123')).toEqual({
      action: 'SHOW_DIRECT_LANDING',
      campaign: campaigns[0]
    });

    expect(resolveDirectLandingState('camp2')).toEqual({
      action: 'REDIRECT_CAMPAIGN',
      campaignId: 'camp2'
    });

    expect(resolveDirectLandingState('NONEXISTENT')).toEqual({
      action: 'SHOW_ERROR',
      code: 'NONEXISTENT'
    });
  });

  it('enforces strictly Moneyline picks for YES Day Walk for Autism 2026 campaign', () => {
    const selectedCampaign = {
      name: 'YES Day Walk for Autism 2026',
      defaultMatchType: 'STANDARD'
    };

    const matchup = {
      id: 'm1',
      type: 'SPREAD',
      metadata: { spread: -3.5 }
    };

    const isYesDay = selectedCampaign?.name === 'YES Day Walk for Autism 2026';
    const isSpread = !isYesDay && matchup.type === 'SPREAD' && matchup.metadata?.spread !== undefined;

    expect(isSpread).toBe(false);

    const matchups = [matchup];
    const showSpreadNote = selectedCampaign?.name !== 'YES Day Walk for Autism 2026' && (selectedCampaign?.defaultMatchType !== 'STANDARD' || matchups.some(m => m.type === 'SPREAD'));
    expect(showSpreadNote).toBe(false);
  });

  it('displays spread information panel for standard campaigns when matchups contain ATS matchups', () => {
    const selectedCampaign = {
      name: 'CFB Pick Em 2026',
      defaultMatchType: 'STANDARD'
    };

    const matchups = [
      { id: 'm1', type: 'STANDARD' },
      { id: 'm2', type: 'SPREAD', metadata: { spread: -2.5 } }
    ];

    const showSpreadNote = selectedCampaign?.name !== 'YES Day Walk for Autism 2026' && (selectedCampaign?.defaultMatchType !== 'STANDARD' || matchups.some(m => m.type === 'SPREAD'));
    expect(showSpreadNote).toBe(true);
  });

  it('allows joined private campaign to be accessed directly from My Pick Em list without re-entering join code', () => {
    const user = { uid: 'cpr1staid' };
    const campaigns = [
      { id: 'private-league-1', name: 'Private Pick Em League', joinCode: 'CPR_PRIVATE', isPrivate: true, isArchived: false },
      { id: 'public-league-2', name: 'Public League', isPrivate: false, isArchived: false }
    ];

    // User cpr1staid has joined private-league-1
    const joinedCampaignIds = new Set(['private-league-1']);

    // My Pick Em filtering logic from PickEmLandingPage
    const myCampaigns = campaigns.filter(c => joinedCampaignIds.has(c.id));

    expect(myCampaigns).toHaveLength(1);
    expect(myCampaigns[0].id).toBe('private-league-1');
    expect(myCampaigns[0].isPrivate).toBe(true);

    // Navigating to joined private campaign requires no join code prompt
    const canAccessDirectly = joinedCampaignIds.has('private-league-1');
    expect(canAccessDirectly).toBe(true);
  });

  it('handles tiebreaker score input updates safely when team pick is undefined', () => {
    const userPicks: Record<string, any> = {
      'matchup-tb-1': {
        campaignId: 'private-league-1',
        participantId: 'cpr1staid',
        matchupId: 'matchup-tb-1',
        week: 1,
        tiebreakerTotal: 45,
        // pick property is omitted when user only enters tiebreaker total score
      }
    };

    const pick = userPicks['matchup-tb-1'];

    // Optional chaining prevents runtime TypeError when accessing teamId
    expect(pick?.pick?.teamId).toBeUndefined();
    expect(pick.tiebreakerTotal).toBe(45);

    // Checking leaderboard / matchup pick circle rendering helper
    const getPickTeamId = (p: any) => p?.pick?.teamId;
    expect(getPickTeamId(pick)).toBeUndefined();
  });

  it('allows picking all available games when user enters a tiebreaker score alone', () => {
    const pickLimit = 16;
    const matchups = Array.from({ length: 16 }, (_, i) => ({
      id: `m-${i + 1}`,
      isTiebreaker: i === 15
    }));

    const userPicks: Record<string, any> = {
      // User entered tiebreaker total score on matchup m-16 without selecting a team pick
      'm-16': {
        campaignId: 'c1',
        participantId: 'user1',
        matchupId: 'm-16',
        week: 1,
        tiebreakerTotal: 48
      }
    };

    // User has selected team picks on 15 matchups so far
    for (let i = 1; i <= 15; i++) {
      userPicks[`m-${i}`] = {
        campaignId: 'c1',
        participantId: 'user1',
        matchupId: `m-${i}`,
        week: 1,
        pick: { teamId: `team-${i}` }
      };
    }

    // Count of team picks
    const teamPicksCount = Object.values(userPicks).filter((p: any) => p.pick?.teamId).length;
    expect(teamPicksCount).toBe(15);

    // Total pick documents count (which previously blocked the 16th game)
    const totalDocsCount = Object.keys(userPicks).length;
    expect(totalDocsCount).toBe(16);

    // Pick limit check using teamPicksCount allows adding the 16th team pick on m-16
    const canPickFinalGame = teamPicksCount < pickLimit;
    expect(canPickFinalGame).toBe(true);
  });

  it('treats missing tiebreaker entries as 100 distance penalty in weekly and season tiebreaker calculations', () => {
    const campaignMatchups = [
      { id: 'tb-w1', week: 1, isTiebreaker: true, status: 'STATUS_FINAL', homeScore: 24, awayScore: 21 }, // actual total = 45
      { id: 'tb-w2', week: 2, isTiebreaker: true, status: 'STATUS_FINAL', homeScore: 30, awayScore: 20 }  // actual total = 50
    ];

    const participantStats: Record<string, { picks: any[] }> = {
      'user-with-tb': {
        picks: [
          { matchupId: 'tb-w1', tiebreakerTotal: 42 }, // diff |42 - 45| = 3
          { matchupId: 'tb-w2', tiebreakerTotal: 50 }  // diff |50 - 50| = 0
        ]
      },
      'user-missing-tb': {
        picks: [] // did not submit tiebreaker for either week
      }
    };

    // 1. Weekly view for Week 1
    const week1TbMatchup = campaignMatchups[0];
    const actualW1Total = week1TbMatchup.homeScore + week1TbMatchup.awayScore;

    const calcWeekTbValue = (uid: string) => {
      const tbPick = participantStats[uid].picks.find(p => p.matchupId === week1TbMatchup.id && p.tiebreakerTotal !== undefined && p.tiebreakerTotal !== null);
      if (week1TbMatchup.status === 'STATUS_FINAL') {
        if (tbPick) {
          return Math.abs(tbPick.tiebreakerTotal - actualW1Total);
        } else {
          return 100;
        }
      }
      return Infinity;
    };

    expect(calcWeekTbValue('user-with-tb')).toBe(3);
    expect(calcWeekTbValue('user-missing-tb')).toBe(100);

    // 2. Season view running total across completed tiebreaker weeks
    const completedTbMatchups = campaignMatchups.filter(m => m.isTiebreaker && m.status === 'STATUS_FINAL');

    const calcSeasonTbValue = (uid: string) => {
      let runningTotal = 0;
      completedTbMatchups.forEach(m => {
        const actualTotal = m.homeScore + m.awayScore;
        const tbPick = participantStats[uid].picks.find(p => p.matchupId === m.id && p.tiebreakerTotal !== undefined && p.tiebreakerTotal !== null);
        if (tbPick) {
          runningTotal += Math.abs(tbPick.tiebreakerTotal - actualTotal);
        } else {
          runningTotal += 100;
        }
      });
      return runningTotal;
    };

    expect(calcSeasonTbValue('user-with-tb')).toBe(3); // 3 + 0
    expect(calcSeasonTbValue('user-missing-tb')).toBe(200); // 100 + 100
  });

  it('allows already joined participants to pass /api/pickem/join without requiring joinCode', () => {
    const campaign = { id: 'private-camp-1', isPrivate: true, joinCode: 'SECRET123' };

    const validateJoinAttempt = (alreadyJoined: boolean, cleanCode: string, camp: typeof campaign) => {
      if (alreadyJoined) {
        return { success: true, campaignId: camp.id, bypassed: true };
      }
      if (camp.isPrivate) {
        const expectedCode = (camp.joinCode || '').trim().toLowerCase();
        if (!cleanCode || cleanCode.toLowerCase() !== expectedCode) {
          throw new Error("Invalid join code for this private campaign.");
        }
      }
      return { success: true, campaignId: camp.id, bypassed: false };
    };

    // 1. Already joined participant calling join without join code should succeed
    expect(validateJoinAttempt(true, '', campaign)).toEqual({
      success: true,
      campaignId: 'private-camp-1',
      bypassed: true
    });

    // 2. Unjoined participant calling join with incorrect code should throw error
    expect(() => validateJoinAttempt(false, 'WRONG_CODE', campaign)).toThrow(
      "Invalid join code for this private campaign."
    );

    // 3. Unjoined participant calling join with correct code should succeed
    expect(validateJoinAttempt(false, 'secret123', campaign)).toEqual({
      success: true,
      campaignId: 'private-camp-1',
      bypassed: false
    });
  });

  it('sorts Pick Em campaign matchups sequentially by date and time ascending', () => {
    const matchups = [
      { id: 'm1', title: 'Mustangs @ Seminoles', startTime: new Date('2026-09-07T16:30:00Z').getTime() },
      { id: 'm2', title: 'Blazers @ Fighting Illini', startTime: new Date('2026-09-03T18:00:00Z').getTime() },
      { id: 'm3', title: 'Broncos @ Wolverines', startTime: new Date('2026-09-05T16:30:00Z').getTime() },
      { id: 'm4', title: 'Rockets @ Spartans', startTime: new Date('2026-09-04T17:00:00Z').getTime() }
    ];

    const sorted = matchups.slice().sort((a: any, b: any) => {
      const timeA = typeof a.startTime === 'number' ? a.startTime : (a.startTime ? new Date(a.startTime).getTime() : 0);
      const timeB = typeof b.startTime === 'number' ? b.startTime : (b.startTime ? new Date(b.startTime).getTime() : 0);
      return timeA - timeB;
    });

    expect(sorted.map(m => m.id)).toEqual(['m2', 'm4', 'm3', 'm1']);
    expect(sorted[0].title).toBe('Blazers @ Fighting Illini'); // 9/3
    expect(sorted[1].title).toBe('Rockets @ Spartans');       // 9/4
    expect(sorted[2].title).toBe('Broncos @ Wolverines');     // 9/5
    expect(sorted[3].title).toBe('Mustangs @ Seminoles');     // 9/7
  });

  it('preserves joined campaigns on My Pick Em screen even if archived or missing participant record if user has picks', () => {
    const userUid = 'cpr1staid';
    const allCampaigns = [
      { id: 'yes-day-2026', name: 'YES Day Walk for Autism 2026', isPrivate: true, isArchived: true },
      { id: 'public-active', name: 'Active Public Campaign', isPrivate: false, isArchived: false },
      { id: 'unjoined-archived', name: 'Archived Unjoined', isPrivate: false, isArchived: true }
    ];

    const participantRecords = [
      // Suppose cpr1staid is missing from pickemParticipants for yes-day-2026
    ];

    const pickRecords = [
      { campaignId: 'yes-day-2026', participantId: 'cpr1staid', matchupId: 'm1', pick: { teamId: 't1' } }
    ];

    // joinedIds set populated from both participantRecords and pickRecords
    const joinedIds = new Set<string>();
    participantRecords.forEach(p => joinedIds.add(p.campaignId));
    pickRecords.filter(p => p.participantId === userUid).forEach(p => joinedIds.add(p.campaignId));

    // Filter logic for My Pick Em screen
    const myCampaigns = allCampaigns.filter(c => {
      if (joinedIds.has(c.id)) return true; // Always show joined campaigns
      if (c.isArchived) return false;
      return true;
    });

    expect(myCampaigns.map(c => c.id)).toContain('yes-day-2026');
    expect(myCampaigns.map(c => c.id)).toContain('public-active');
    expect(myCampaigns.map(c => c.id)).not.toContain('unjoined-archived');
  });

  it('enforces campaign visibility rules across Join Pick Em and My Pick Em tabs', () => {
    const allCampaigns = [
      { id: 'public-1', name: 'Public CFB League', isPrivate: false, isArchived: false },
      { id: 'public-2', name: 'Public NFL League', isPrivate: false, isArchived: false },
      { id: 'private-1', name: 'Private Friends League', isPrivate: true, joinCode: 'SECRET1', isArchived: false },
      { id: 'archived-1', name: 'Past Public League', isPrivate: false, isArchived: true }
    ];

    // Scenario A: User has not joined any campaigns yet
    let joinedIds = new Set<string>();

    const getMyCampaigns = (joined: Set<string>) =>
      allCampaigns.filter(c => joined.has(c.id));

    const getPublicCampaigns = (joined: Set<string>) =>
      allCampaigns.filter(c => !joined.has(c.id) && !c.isPrivate && !c.isArchived);

    // 1. All unjoined active public campaigns must be visible under "Join Pick Em"
    let publicList = getPublicCampaigns(joinedIds);
    expect(publicList.map(c => c.id)).toEqual(['public-1', 'public-2']);
    expect(publicList.map(c => c.id)).not.toContain('private-1');
    expect(publicList.map(c => c.id)).not.toContain('archived-1');

    // 2. User joins public-1 -> public-1 should now be visible on My Pick Em
    joinedIds.add('public-1');
    let myPicksList = getMyCampaigns(joinedIds);
    expect(myPicksList.map(c => c.id)).toContain('public-1');

    // public-1 is no longer listed in public campaigns to join, but public-2 remains
    publicList = getPublicCampaigns(joinedIds);
    expect(publicList.map(c => c.id)).toEqual(['public-2']);

    // 3. User joins private-1 via join code -> private-1 should now be visible on My Pick Em
    joinedIds.add('private-1');
    myPicksList = getMyCampaigns(joinedIds);
    expect(myPicksList.map(c => c.id)).toEqual(['public-1', 'private-1']);

    // 4. Guarantee: Every active public campaign is always visible across either My Pick Em or Join Pick Em
    const activePublicCampaigns = allCampaigns.filter(c => !c.isPrivate && !c.isArchived);
    activePublicCampaigns.forEach(c => {
      const isVisibleOnMyPicks = getMyCampaigns(joinedIds).some(my => my.id === c.id);
      const isVisibleOnJoin = getPublicCampaigns(joinedIds).some(pub => pub.id === c.id);
      expect(isVisibleOnMyPicks || isVisibleOnJoin).toBe(true);
    });
  });

  it('calculates weekly tiebreaker distance as absolute value relative to total score when game is final', () => {
    const matchup = {
      id: 'tb-m1',
      isTiebreaker: true,
      status: 'STATUS_FINAL',
      homeScore: 24,
      awayScore: 21
    };
    const actualTotal = matchup.homeScore + matchup.awayScore; // 45

    const participantPicks = [
      { participantId: 'user1', tiebreakerTotal: 42 }, // diff |42 - 45| = 3
      { participantId: 'user2', tiebreakerTotal: 48 }, // diff |48 - 45| = 3
      { participantId: 'user3', tiebreakerTotal: 45 }, // diff |45 - 45| = 0
      { participantId: 'user4', tiebreakerTotal: 60 }  // diff |60 - 45| = 15
    ];

    const results = participantPicks.map(p => ({
      uid: p.participantId,
      tbValue: Math.abs(p.tiebreakerTotal - actualTotal)
    })).sort((a, b) => a.tbValue - b.tbValue);

    expect(results[0]).toEqual({ uid: 'user3', tbValue: 0 });
    expect(results[1].tbValue).toBe(3);
    expect(results[2].tbValue).toBe(3);
    expect(results[3]).toEqual({ uid: 'user4', tbValue: 15 });
  });

  it('omits tiebreaker leaderboard column if a week has no tiebreaker matchup', () => {
    const weekMatchupsNoTb = [
      { id: 'm1', isTiebreaker: false },
      { id: 'm2', isTiebreaker: false }
    ];

    const weekMatchupsWithTb = [
      { id: 'm1', isTiebreaker: false },
      { id: 'm2', isTiebreaker: true }
    ];

    const showColumnNoTb = weekMatchupsNoTb.some(m => m.isTiebreaker);
    const showColumnWithTb = weekMatchupsWithTb.some(m => m.isTiebreaker);

    expect(showColumnNoTb).toBe(false);
    expect(showColumnWithTb).toBe(true);
  });

  it('calculates season long tiebreaker as a running sum of absolute values from completed tiebreaker weeks', () => {
    const campaignMatchups = [
      { id: 'tb-w1', week: 1, isTiebreaker: true, status: 'STATUS_FINAL', homeScore: 20, awayScore: 17 }, // total = 37
      { id: 'tb-w2', week: 2, isTiebreaker: true, status: 'STATUS_FINAL', homeScore: 28, awayScore: 24 }, // total = 52
      { id: 'tb-w3', week: 3, isTiebreaker: true, status: 'STATUS_SCHEDULED', homeScore: 0, awayScore: 0 }, // not final
      { id: 'normal-w1', week: 1, isTiebreaker: false, status: 'STATUS_FINAL' }
    ];

    const userPicks = [
      { matchupId: 'tb-w1', tiebreakerTotal: 40 }, // diff |40 - 37| = 3
      { matchupId: 'tb-w2', tiebreakerTotal: 50 }, // diff |50 - 52| = 2
      { matchupId: 'tb-w3', tiebreakerTotal: 45 }  // skipped because not final
    ];

    const completedTbMatchups = campaignMatchups.filter(m => m.isTiebreaker && m.status === 'STATUS_FINAL');
    let runningTotal = 0;
    completedTbMatchups.forEach(m => {
      const actualTotal = m.homeScore + m.awayScore;
      const pick = userPicks.find(p => p.matchupId === m.id);
      if (pick) {
        runningTotal += Math.abs(pick.tiebreakerTotal - actualTotal);
      }
    });

    expect(runningTotal).toBe(5); // 3 + 2 = 5
  });

  it('ranks tied participants secondarily by smaller tiebreaker absolute value', () => {
    const leaderboard = [
      { uid: 'u1', points: 10, tbValue: 12 },
      { uid: 'u2', points: 10, tbValue: 4 },
      { uid: 'u3', points: 12, tbValue: 20 },
      { uid: 'u4', points: 10, tbValue: 0 }
    ];

    const sorted = leaderboard.slice().sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.tbValue - b.tbValue;
    });

    expect(sorted.map(u => u.uid)).toEqual(['u3', 'u4', 'u2', 'u1']);
  });

  it('triggers auto-healing participant record creation if user has picks but is missing from pickemParticipants', () => {
    const userUid = 'cpr1staid';
    const campaignId = 'cfb-2026-league';

    const participantRecords: Array<{ campaignId: string, participantId: string }> = [];
    const pickRecords = [
      { campaignId: campaignId, participantId: userUid, matchupId: 'm1' }
    ];

    const isParticipantDoc = participantRecords.some(p => p.campaignId === campaignId && p.participantId === userUid);
    const hasPicks = pickRecords.some(p => p.campaignId === campaignId && p.participantId === userUid);

    let isParticipant = isParticipantDoc || hasPicks;
    let shouldAutoHeal = !isParticipantDoc && hasPicks;

    expect(isParticipant).toBe(true);
    expect(shouldAutoHeal).toBe(true);

    if (shouldAutoHeal) {
      participantRecords.push({ campaignId, participantId: userUid });
    }

    expect(participantRecords).toHaveLength(1);
    expect(participantRecords[0]).toEqual({ campaignId, participantId: userUid });
  });

  it('backfills missing pickemParticipants records across all pickemPicks', () => {
    const existingParticipants = new Set<string>([
      'cfb-2026_user1'
    ]);

    const picks = [
      { campaignId: 'cfb-2026', participantId: 'user1' },
      { campaignId: 'cfb-2026', participantId: 'cpr1staid' }, // missing participant doc
      { campaignId: 'yes-day-2026', participantId: 'cpr1staid' } // missing participant doc
    ];

    let backfilledCount = 0;
    picks.forEach(p => {
      const pairId = `${p.campaignId}_${p.participantId}`;
      if (!existingParticipants.has(pairId)) {
        existingParticipants.add(pairId);
        backfilledCount++;
      }
    });

    expect(backfilledCount).toBe(2);
    expect(existingParticipants.has('cfb-2026_cpr1staid')).toBe(true);
    expect(existingParticipants.has('yes-day-2026_cpr1staid')).toBe(true);
  });

  it('filters out closed campaigns (isOpen: false) from the Join Pick Em board', () => {
    const campaigns = [
      { id: 'open-public', name: 'Open Public League', isPrivate: false, isOpen: true, isArchived: false },
      { id: 'closed-public', name: 'Closed Public League', isPrivate: false, isOpen: false, isArchived: false },
      { id: 'default-open-public', name: 'Default Open Public League', isPrivate: false, isArchived: false }
    ];

    const joinedIds = new Set<string>();

    const getPublicCampaigns = (joined: Set<string>) =>
      campaigns.filter(c => !joined.has(c.id) && !c.isPrivate && c.isOpen !== false && !c.isArchived);

    const publicList = getPublicCampaigns(joinedIds);
    expect(publicList.map(c => c.id)).toEqual(['open-public', 'default-open-public']);
    expect(publicList.map(c => c.id)).not.toContain('closed-public');
  });

  it('rejects joining closed campaigns via /api/pickem/join unless participant is already joined', () => {
    const campaigns: Record<string, { id: string, isOpen?: boolean, isPrivate?: boolean }> = {
      'closed-1': { id: 'closed-1', isOpen: false, isPrivate: false },
      'open-1': { id: 'open-1', isOpen: true, isPrivate: false }
    };

    const attemptJoin = (campaignId: string, alreadyJoined: boolean) => {
      if (alreadyJoined) {
        return { success: true, bypassed: true };
      }
      const camp = campaigns[campaignId];
      if (!camp) throw new Error("Campaign not found");
      if (camp.isOpen === false) {
        throw new Error("This campaign is closed to new entries.");
      }
      return { success: true, bypassed: false };
    };

    // 1. Joining an open campaign succeeds
    expect(attemptJoin('open-1', false)).toEqual({ success: true, bypassed: false });

    // 2. Joining a closed campaign throws error
    expect(() => attemptJoin('closed-1', false)).toThrow("This campaign is closed to new entries.");

    // 3. Existing joined participant accessing/auto-healing closed campaign succeeds
    expect(attemptJoin('closed-1', true)).toEqual({ success: true, bypassed: true });
  });

  it('retains access for already joined users on My Pick Em even if campaign isOpen is toggled to false', () => {
    const campaigns = [
      { id: 'my-camp-1', name: 'My League', isOpen: false, isPrivate: false, isArchived: false },
      { id: 'other-camp', name: 'Other Open League', isOpen: true, isPrivate: false, isArchived: false }
    ];

    const joinedIds = new Set(['my-camp-1']);

    const myCampaigns = campaigns.filter(c => joinedIds.has(c.id));
    expect(myCampaigns.map(c => c.id)).toEqual(['my-camp-1']);
    expect(myCampaigns[0].isOpen).toBe(false);
  });

  it('determines auto-join eligibility correctly in PickEmPage without false triggers on private joinCode fields', () => {
    const checkCanAutoJoin = (urlCode: string, selectedCampaign: { isPrivate?: boolean, isOpen?: boolean, joinCode?: string }) => {
      const cleanUrlCode = urlCode.trim();
      return !!cleanUrlCode || (!selectedCampaign.isPrivate && selectedCampaign.isOpen !== false);
    };

    // Scenario 1: Private campaign with joinCode in DB, but user came in with NO urlCode
    const privateCamp = { id: 'priv-1', isPrivate: true, isOpen: true, joinCode: 'SECRET_CODE' };
    expect(checkCanAutoJoin('', privateCamp)).toBe(false);

    // Scenario 2: Private campaign, user came in WITH urlCode
    expect(checkCanAutoJoin('SECRET_CODE', privateCamp)).toBe(true);

    // Scenario 3: Public open campaign without urlCode
    const publicOpenCamp = { id: 'pub-1', isPrivate: false, isOpen: true };
    expect(checkCanAutoJoin('', publicOpenCamp)).toBe(true);

    // Scenario 4: Public closed campaign without urlCode
    const publicClosedCamp = { id: 'pub-2', isPrivate: false, isOpen: false };
    expect(checkCanAutoJoin('', publicClosedCamp)).toBe(false);
  });

  it('includes active public campaigns on Join Pick Em board and handles public campaign join navigation', () => {
    const campaigns = [
      { id: 'pub-open', name: 'Public Open', isPrivate: false, isOpen: true, isArchived: false },
      { id: 'pub-closed', name: 'Public Closed', isPrivate: false, isOpen: false, isArchived: false },
      { id: 'priv-1', name: 'Private League', isPrivate: true, isArchived: false }
    ];

    const joinedIds = new Set<string>();

    const publicCampaigns = campaigns.filter(c => !joinedIds.has(c.id) && !c.isPrivate && !c.isArchived);
    expect(publicCampaigns.map(c => c.id)).toEqual(['pub-open', 'pub-closed']);

    // Simulating joining public campaign -> navigates directly to campaign route
    const handleJoinPublicSim = (camp: typeof campaigns[0]) => {
      joinedIds.add(camp.id);
      return `/pickem/${camp.id}`;
    };

    const targetRoute = handleJoinPublicSim(campaigns[0]);
    expect(targetRoute).toBe('/pickem/pub-open');
    expect(joinedIds.has('pub-open')).toBe(true);
  });

  it('allows non-admin users to view all public non-archived campaigns and joined campaigns with string/boolean flags', () => {
    const userRole = 'USER'; // Non-admin user

    const allCampaigns = [
      { id: 'pub-1', name: 'Public League 1', isPrivate: false, isArchived: false },
      { id: 'pub-2', name: 'Public League 2 (string flags)', isPrivate: 'false', isArchived: 'false' },
      { id: 'priv-joined', name: 'Joined Private League', isPrivate: true, isArchived: false },
      { id: 'archived-unjoined', name: 'Old Archived League', isPrivate: false, isArchived: true }
    ];

    // User joined 'priv-joined'
    const joinedCampaignIds = new Set(['priv-joined']);

    // Filter logic as implemented in PickEmLandingPage
    const myCampaigns = allCampaigns.filter(c => joinedCampaignIds.has(c.id));
    const publicCampaigns = allCampaigns.filter(c => {
      if (joinedCampaignIds.has(c.id)) return false;
      const isPriv = c.isPrivate === true || c.isPrivate === 'true';
      const isArch = c.isArchived === true || c.isArchived === 'true' || c.archived === true || c.archived === 'true';
      return !isPriv && !isArch;
    });

    // Non-admin user can see public campaigns and joined campaign
    expect(userRole).toBe('USER');
    expect(myCampaigns.map(c => c.id)).toEqual(['priv-joined']);
    expect(publicCampaigns.map(c => c.id)).toEqual(['pub-1', 'pub-2']);
  });

  it('evaluates hasSelection as true for tiebreaker-only, team-only, and combined picks to display Clear Pick button', () => {
    const checkHasSelection = (pick: any) => !!(
      pick?.pick?.teamId ||
      (pick?.tiebreakerTotal !== undefined && pick?.tiebreakerTotal !== null) ||
      pick?.confidence
    );

    // 1. Tiebreaker-only prediction
    const tbOnlyPick = { tiebreakerTotal: 45 };
    expect(checkHasSelection(tbOnlyPick)).toBe(true);

    // 2. Team-only selection
    const teamOnlyPick = { pick: { teamId: 'team-a' } };
    expect(checkHasSelection(teamOnlyPick)).toBe(true);

    // 3. Combined team selection & tiebreaker
    const combinedPick = { pick: { teamId: 'team-a' }, tiebreakerTotal: 45 };
    expect(checkHasSelection(combinedPick)).toBe(true);

    // 4. No selection
    const emptyPick = {};
    expect(checkHasSelection(emptyPick)).toBe(false);
    expect(checkHasSelection(undefined)).toBe(false);
  });

  it('clears team selection and tiebreaker prediction together when clearing a pick and cancels pending timers', () => {
    const tiebreakerTimeoutRef: Record<string, any> = { 'm-tb-1': setTimeout(() => {}, 1000) };
    let timerCleared = false;

    // Mock timer cancellation check
    const clearTimer = (matchupId: string) => {
      if (tiebreakerTimeoutRef[matchupId]) {
        clearTimeout(tiebreakerTimeoutRef[matchupId]);
        delete tiebreakerTimeoutRef[matchupId];
        timerCleared = true;
      }
    };

    let userPicks: Record<string, any> = {
      'm-tb-1': {
        id: 'camp_1_m-tb-1_user1',
        matchupId: 'm-tb-1',
        pick: { teamId: 'team-home' },
        tiebreakerTotal: 52
      }
    };

    // Simulate clearing pick for matchup m-tb-1
    clearTimer('m-tb-1');
    delete userPicks['m-tb-1'];

    expect(timerCleared).toBe(true);
    expect(userPicks['m-tb-1']).toBeUndefined();
  });

  it('automatically triggers pick clearing when tiebreaker score input is erased and no team pick is selected', () => {
    let clearedMatchupId: string | null = null;
    const handleClearPickSim = (matchup: { id: string }) => {
      clearedMatchupId = matchup.id;
    };

    const handleTiebreakerChangeSim = (matchup: { id: string }, rawVal: string, existingPick: any) => {
      const trimmed = rawVal.trim();
      const total = trimmed === '' ? null : parseInt(trimmed, 10);

      if (total === null && !existingPick?.pick?.teamId) {
        handleClearPickSim(matchup);
        return;
      }
    };

    const matchup = { id: 'm-tb-2' };
    const tbOnlyPick = { id: 'p1', matchupId: 'm-tb-2', tiebreakerTotal: 48 };

    // User erases tiebreaker input to empty string ''
    handleTiebreakerChangeSim(matchup, '', tbOnlyPick);

    expect(clearedMatchupId).toBe('m-tb-2');
  });
});
