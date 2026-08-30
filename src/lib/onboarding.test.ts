import { describe, it, expect } from 'vitest';

function sanitizeUsernameCandidate(candidate: string): string {
  const sanitized = candidate.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  return sanitized.length >= 3 ? sanitized : 'User' + Math.floor(Math.random() * 1000000);
}

function prepareUserProfilePayload(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }, username?: string) {
  const rawCandidate = username || user.displayName || user.email?.split('@')[0] || '';
  const resolvedUsername = sanitizeUsernameCandidate(rawCandidate);
  const nameCandidate = (user.displayName || user.email?.split('@')[0] || 'Anonymous').slice(0, 100);
  const emailCandidate = (user.email || '').slice(0, 200);

  return {
    email: emailCandidate,
    name: nameCandidate,
    username: resolvedUsername,
    usernameLower: resolvedUsername.toLowerCase(),
    image: user.photoURL || '',
    links: 10,
    role: 'USER',
    status: 'ACTIVE',
    stats: { wins: 0, losses: 0, pushes: 0 },
    createdAt: 1000,
    updatedAt: 1000,
    needsOnboarding: username ? false : true,
  };
}

describe('Onboarding profile setup', () => {
  it('sanitizes Google user metadata into valid Firestore fields', () => {
    const googleUser = {
      uid: 'google-uid-123',
      email: 'john.doe.super.long.email.address.example.com@gmail.com',
      displayName: 'John Doe Very Long Name '.repeat(10), // > 100 chars
      photoURL: 'https://example.com/avatar.png',
    };

    const payload = prepareUserProfilePayload(googleUser);

    expect(payload.email).toBe(googleUser.email);
    expect(payload.name.length).toBeLessThanOrEqual(100);
    expect(payload.username).toBe('JohnDoeVeryLongNameJ');
    expect(payload.usernameLower).toBe('johndoeverylongnamej');
    expect(payload.needsOnboarding).toBe(true);
    expect(payload.role).toBe('USER');
    expect(payload.status).toBe('ACTIVE');
  });

  it('handles Google user with missing displayName or email correctly', () => {
    const googleUser = {
      uid: 'google-uid-456',
      email: null,
      displayName: null,
      photoURL: null,
    };

    const payload = prepareUserProfilePayload(googleUser);

    expect(payload.email).toBe('');
    expect(payload.name).toBe('Anonymous');
    expect(payload.username).toMatch(/^User\d+$/);
    expect(payload.needsOnboarding).toBe(true);
  });

  it('sets needsOnboarding to false when explicit valid username is provided during onboarding', () => {
    const googleUser = {
      uid: 'google-uid-789',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      photoURL: null,
    };

    const payload = prepareUserProfilePayload(googleUser, 'janedoe99');

    expect(payload.username).toBe('janedoe99');
    expect(payload.usernameLower).toBe('janedoe99');
    expect(payload.needsOnboarding).toBe(false);
  });

  it('correctly filters out auto-generated UserNNN patterns from auto-suggest candidate', () => {
    const user = { displayName: null, email: 'alex@example.com' };
    const profile = { name: 'User987654' };

    const rawCandidate = user?.displayName || (profile?.name && !/^User\d+$/i.test(profile.name) ? profile.name : '') || user?.email?.split('@')[0] || '';
    const sanitized = rawCandidate.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);

    expect(sanitized).toBe('alex');
  });
});
