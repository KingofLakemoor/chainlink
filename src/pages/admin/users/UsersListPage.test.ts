import { describe, it, expect } from 'vitest';

interface UserRecord {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  isTestAccount?: boolean;
  links?: number;
  isPremium?: boolean;
}

function computeMetrics(users: UserRecord[]) {
  return {
    totalUsers: users.length,
    adminCount: users.filter(u => u.role === 'ADMIN').length,
    testAccountCount: users.filter(u => u.isTestAccount).length,
    totalLinksCirculation: users.reduce((acc, u) => acc + (u.links || 0), 0)
  };
}

function filterUsers(
  users: UserRecord[],
  searchTerm: string,
  roleFilter: 'ALL' | 'USER' | 'ADMIN',
  typeFilter: 'ALL' | 'REAL' | 'TEST',
  premiumFilter: 'ALL' | 'PREMIUM' | 'STANDARD'
) {
  return users.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (typeFilter === 'REAL' && u.isTestAccount) return false;
    if (typeFilter === 'TEST' && !u.isTestAccount) return false;
    if (premiumFilter === 'PREMIUM' && !u.isPremium) return false;
    if (premiumFilter === 'STANDARD' && u.isPremium) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = (u.name || '').toLowerCase().includes(term);
      const matchesUsername = (u.username || '').toLowerCase().includes(term);
      const matchesEmail = (u.email || '').toLowerCase().includes(term);
      const matchesId = u.id.toLowerCase().includes(term);
      return matchesName || matchesUsername || matchesEmail || matchesId;
    }

    return true;
  });
}

describe('UsersListPage logic and filtering', () => {
  const sampleUsers: UserRecord[] = [
    { id: 'u1', name: 'Alice Smith', username: 'alice', email: 'alice@example.com', role: 'ADMIN', isTestAccount: false, links: 500, isPremium: true },
    { id: 'u2', name: 'Bob Jones', username: 'bobjones', email: 'bob@example.com', role: 'USER', isTestAccount: false, links: 120, isPremium: false },
    { id: 'u3', name: 'Bogus Tester', username: 'test_user1', email: 'test1@example.com', role: 'USER', isTestAccount: true, links: 100, isPremium: false },
    { id: 'u4', name: 'Charlie Brown', username: 'charlie', email: 'charlie@example.com', role: 'ADMIN', isTestAccount: true, links: 250, isPremium: true },
  ];

  it('correctly calculates metric summary stats', () => {
    const metrics = computeMetrics(sampleUsers);
    expect(metrics.totalUsers).toBe(4);
    expect(metrics.adminCount).toBe(2);
    expect(metrics.testAccountCount).toBe(2);
    expect(metrics.totalLinksCirculation).toBe(970);
  });

  it('filters users by search term across name, username, and email', () => {
    const searchAlice = filterUsers(sampleUsers, 'alice', 'ALL', 'ALL', 'ALL');
    expect(searchAlice).toHaveLength(1);
    expect(searchAlice[0].id).toBe('u1');

    const searchTest = filterUsers(sampleUsers, 'test1', 'ALL', 'ALL', 'ALL');
    expect(searchTest).toHaveLength(1);
    expect(searchTest[0].id).toBe('u3');
  });

  it('filters users by role (ADMIN / USER)', () => {
    const adminsOnly = filterUsers(sampleUsers, '', 'ADMIN', 'ALL', 'ALL');
    expect(adminsOnly).toHaveLength(2);
    expect(adminsOnly.every(u => u.role === 'ADMIN')).toBe(true);

    const usersOnly = filterUsers(sampleUsers, '', 'USER', 'ALL', 'ALL');
    expect(usersOnly).toHaveLength(2);
    expect(usersOnly.every(u => u.role === 'USER')).toBe(true);
  });

  it('filters users by account type (REAL / TEST)', () => {
    const realOnly = filterUsers(sampleUsers, '', 'ALL', 'REAL', 'ALL');
    expect(realOnly).toHaveLength(2);
    expect(realOnly.every(u => !u.isTestAccount)).toBe(true);

    const testOnly = filterUsers(sampleUsers, '', 'ALL', 'TEST', 'ALL');
    expect(testOnly).toHaveLength(2);
    expect(testOnly.every(u => u.isTestAccount)).toBe(true);
  });

  it('filters users by premium membership status', () => {
    const premiumOnly = filterUsers(sampleUsers, '', 'ALL', 'ALL', 'PREMIUM');
    expect(premiumOnly).toHaveLength(2);
    expect(premiumOnly.every(u => u.isPremium)).toBe(true);
  });
});
