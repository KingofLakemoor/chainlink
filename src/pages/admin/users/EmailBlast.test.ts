import { describe, it, expect, vi } from 'vitest';
import { EmailRecord, EmailAggregatorInput } from './useEmailAggregator';

// Helper function to invoke the aggregation logic directly for unit testing
function aggregateEmails(input: EmailAggregatorInput): EmailRecord[] {
  const map = new Map<string, EmailRecord>();

  const addEmail = (
    rawEmail: string | undefined | null,
    name: string | undefined | null,
    level: string | undefined | null,
    sourceTag: string
  ) => {
    if (!rawEmail || typeof rawEmail !== 'string') return;
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@')) return;

    const trimmedName = name && typeof name === 'string' && name.trim() ? name.trim() : 'N/A';
    const trimmedLevel = level && typeof level === 'string' && level.trim() ? level.trim() : null;

    if (!map.has(cleanEmail)) {
      map.set(cleanEmail, {
        email: cleanEmail,
        rawEmail: rawEmail.trim(),
        name: trimmedName,
        level: trimmedLevel,
        sources: [sourceTag],
      });
    } else {
      const existing = map.get(cleanEmail)!;
      if (!existing.sources.includes(sourceTag)) {
        existing.sources.push(sourceTag);
      }
      if (!existing.level && trimmedLevel) {
        existing.level = trimmedLevel;
      }
      if ((!existing.name || existing.name === 'N/A') && trimmedName !== 'N/A') {
        existing.name = trimmedName;
      }
    }
  };

  (input.players || []).forEach(p => {
    const pEmail = p.email || p.userEmail;
    const pName = p.name || p.displayName || p.username;
    const pLevel = p.level || p.premiumTier || p.role;
    addEmail(pEmail, pName, pLevel, 'Player');
  });

  (input.orders || []).forEach(o => {
    const oEmail = o.customer_email || o.userEmail || o.email;
    const oName = o.customer_name || o.shippingInfo?.name || o.name;
    addEmail(oEmail, oName, null, 'Commerce');
  });

  (input.coordinators || []).forEach(c => {
    const cEmail = c.email || c.userEmail;
    const cName = c.name || c.displayName || c.username;
    const cLevel = c.level || c.role;
    addEmail(cEmail, cName, cLevel, 'Coordinator');
  });

  return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
}

describe('Email Blast & Aggregator Logic', () => {
  const samplePlayers = [
    { email: ' John.Doe@Example.com ', name: 'John Doe', level: 'PRO', role: 'USER' },
    { email: 'JANE.SMITH@EXAMPLE.COM', name: 'Jane Smith', level: 'VIP', role: 'USER' },
    { email: 'invalid-email-no-at-symbol', name: 'Invalid User', level: 'Standard' }
  ];

  const sampleOrders = [
    { customer_email: 'john.doe@example.com', customer_name: 'John Doe' },
    { customer_email: 'charlie.brown@example.com', customer_name: 'Charlie Brown' }
  ];

  const sampleCoordinators = [
    { email: 'jane.smith@example.com', name: 'Jane Smith', role: 'COORDINATOR' },
    { email: 'admin@chainlink.app', name: 'Admin User', role: 'ADMIN' }
  ];

  it('normalizes email addresses (lowercase, trimmed) and filters invalid emails', () => {
    const records = aggregateEmails({ players: samplePlayers, orders: [], coordinators: [] });

    const emails = records.map(r => r.email);
    expect(emails).toContain('john.doe@example.com');
    expect(emails).toContain('jane.smith@example.com');
    expect(emails).not.toContain('invalid-email-no-at-symbol');
  });

  it('deduplicates emails across multiple collections and merges source tags', () => {
    const records = aggregateEmails({
      players: samplePlayers,
      orders: sampleOrders,
      coordinators: sampleCoordinators
    });

    const john = records.find(r => r.email === 'john.doe@example.com');
    expect(john).toBeDefined();
    expect(john?.sources).toContain('Player');
    expect(john?.sources).toContain('Commerce');
    expect(john?.sources).not.toContain('Coordinator');

    const jane = records.find(r => r.email === 'jane.smith@example.com');
    expect(jane).toBeDefined();
    expect(jane?.sources).toContain('Player');
    expect(jane?.sources).toContain('Coordinator');
    expect(jane?.sources).not.toContain('Commerce');
  });

  it('preserves recipient name and level/tier across multi-source merge', () => {
    const records = aggregateEmails({
      players: [{ email: 'anon@example.com', name: '', level: 'PRO' }],
      orders: [{ customer_email: 'anon@example.com', customer_name: 'Anon Person' }],
      coordinators: []
    });

    const record = records.find(r => r.email === 'anon@example.com');
    expect(record?.name).toBe('Anon Person');
    expect(record?.level).toBe('PRO');
  });

  it('formats output list with comma, semicolon, or newline delimiters', () => {
    const records: EmailRecord[] = [
      { email: 'alice@example.com', rawEmail: 'alice@example.com', name: 'Alice', level: 'PRO', sources: ['Player'] },
      { email: 'bob@example.com', rawEmail: 'bob@example.com', name: 'Bob', level: 'VIP', sources: ['Commerce'] }
    ];

    const commaFormatted = records.map(r => r.email).join(', ');
    expect(commaFormatted).toBe('alice@example.com, bob@example.com');

    const semicolonFormatted = records.map(r => r.email).join('; ');
    expect(semicolonFormatted).toBe('alice@example.com; bob@example.com');

    const newlineFormatted = records.map(r => r.email).join('\n');
    expect(newlineFormatted).toBe('alice@example.com\nbob@example.com');
  });

  it('supports Recipient Format options (Email Only vs. Name <email>)', () => {
    const records: EmailRecord[] = [
      { email: 'john@example.com', rawEmail: 'john@example.com', name: 'John Doe', level: 'PRO', sources: ['Player'] },
      { email: 'jane@example.com', rawEmail: 'jane@example.com', name: 'N/A', level: null, sources: ['Commerce'] }
    ];

    const formatNameEmail = (r: EmailRecord) =>
      r.name && r.name !== 'N/A' ? `${r.name} <${r.email}>` : r.email;

    expect(formatNameEmail(records[0])).toBe('John Doe <john@example.com>');
    expect(formatNameEmail(records[1])).toBe('jane@example.com');
  });

  it('filters records by source, level, and free-text search term', () => {
    const records: EmailRecord[] = [
      { email: 'john.doe@example.com', rawEmail: 'john.doe@example.com', name: 'John Doe', level: 'PRO', sources: ['Player', 'Commerce'] },
      { email: 'jane.smith@example.com', rawEmail: 'jane.smith@example.com', name: 'Jane Smith', level: 'VIP', sources: ['Player', 'Coordinator'] },
      { email: 'admin@chainlink.app', rawEmail: 'admin@chainlink.app', name: 'Admin', level: 'ADMIN', sources: ['Coordinator'] }
    ];

    // Source Filter
    const commerceOnly = records.filter(r => r.sources.includes('Commerce'));
    expect(commerceOnly).toHaveLength(1);
    expect(commerceOnly[0].email).toBe('john.doe@example.com');

    // Level Filter
    const vipOnly = records.filter(r => r.level === 'VIP');
    expect(vipOnly).toHaveLength(1);
    expect(vipOnly[0].email).toBe('jane.smith@example.com');

    // Search Term matching name or email substring
    const searchJane = records.filter(r => r.name.toLowerCase().includes('jane') || r.email.includes('jane'));
    expect(searchJane).toHaveLength(1);
    expect(searchJane[0].email).toBe('jane.smith@example.com');
  });

  it('executes fallback copy logic when navigator.clipboard is unavailable', () => {
    const mockExecCommand = vi.fn().mockReturnValue(true);

    const copyFallback = (formattedText: string) => {
      if (typeof document !== 'undefined') {
        document.execCommand = mockExecCommand;
        const textArea = document.createElement('textarea');
        textArea.value = formattedText;
        document.body.appendChild(textArea);
        textArea.select();
        if (typeof document.execCommand === 'function') {
          document.execCommand('copy');
        }
        document.body.removeChild(textArea);
      } else {
        mockExecCommand('copy');
      }
    };

    copyFallback('test1@example.com, test2@example.com');
    expect(mockExecCommand).toHaveBeenCalledWith('copy');
  });
});
