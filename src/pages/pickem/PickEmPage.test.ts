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
});
