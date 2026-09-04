import { describe, it, expect } from 'vitest';

describe('Admin Link Transactions Log Logic', () => {
  it('formats various date representations correctly', () => {
    const formatDate = (val: any) => {
      if (!val) return 'Unknown';
      if (typeof val === 'number') return new Date(val).toLocaleString();
      if (typeof val === 'string') return new Date(val).toLocaleString();
      if (val.seconds) return new Date(val.seconds * 1000).toLocaleString();
      return 'Unknown';
    };

    const msTimestamp = 1710000000000;
    const dateStr = '2025-01-01T12:00:00.000Z';
    const firestoreTimestamp = { seconds: 1710000000, nanoseconds: 0 };

    expect(formatDate(msTimestamp)).not.toBe('Unknown');
    expect(formatDate(dateStr)).not.toBe('Unknown');
    expect(formatDate(firestoreTimestamp)).not.toBe('Unknown');
    expect(formatDate(null)).toBe('Unknown');
  });

  it('constructs API endpoint URL parameters accurately', () => {
    const origin = 'http://localhost:3000';
    const searchUsername = 'testuser';
    const lastLogId = 'log_123';

    const url = new URL('/api/admin/link-transactions', origin);
    if (searchUsername) {
      url.searchParams.set('username', searchUsername);
    }
    if (lastLogId) {
      url.searchParams.set('startAfterId', lastLogId);
    }

    expect(url.searchParams.get('username')).toBe('testuser');
    expect(url.searchParams.get('startAfterId')).toBe('log_123');
  });

  it('applies correct amount sign and CSS class for positive and negative transactions', () => {
    const logs = [
      { id: '1', amount: 50, type: 'DAILY_CLAIM' },
      { id: '2', amount: -20, type: 'WAGER_PLACED' },
      { id: '3', amount: 0, type: 'ADJUSTMENT' },
    ];

    const getAmountClass = (amount: number) => {
      return amount > 0 ? 'text-emerald-400' : amount < 0 ? 'text-red-400' : 'text-zinc-300';
    };

    const formatAmountDisplay = (amount: number) => {
      return `${amount > 0 ? '+' : ''}${amount}`;
    };

    expect(getAmountClass(logs[0].amount)).toBe('text-emerald-400');
    expect(formatAmountDisplay(logs[0].amount)).toBe('+50');

    expect(getAmountClass(logs[1].amount)).toBe('text-red-400');
    expect(formatAmountDisplay(logs[1].amount)).toBe('-20');

    expect(getAmountClass(logs[2].amount)).toBe('text-zinc-300');
    expect(formatAmountDisplay(logs[2].amount)).toBe('0');
  });
});
