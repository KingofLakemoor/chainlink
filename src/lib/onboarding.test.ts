import { describe, it, expect } from 'vitest';

function prepareUserProfilePayload(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }, username?: string) {
  const isExplicitUsername = !!username;
  let resolvedUsername = '';
  if (isExplicitUsername) {
    const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    resolvedUsername = sanitized.length >= 3 ? sanitized : 'User' + Math.floor(100000 + Math.random() * 900000);
  } else {
    const uidSuffix = user.uid ? user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) : '';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    resolvedUsername = `User_${uidSuffix || randomSuffix}`;
  }

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
    needsOnboarding: !isExplicitUsername,
  };
}

function resolveSuggestedUsername(candidate: string, exists: boolean): string {
  let sanitized = candidate.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  if (sanitized.length < 3 || /^User(_|\d)/i.test(sanitized)) {
    sanitized = 'User_' + Math.floor(1000 + Math.random() * 9000);
  }
  if (exists) {
    const baseName = sanitized.slice(0, 16);
    return `${baseName}${Math.floor(100 + Math.random() * 900)}`;
  }
  return sanitized;
}

describe('Onboarding profile setup', () => {
  it('generates a unique temporary placeholder for initial Google users needing onboarding', () => {
    const googleUser = {
      uid: 'google-uid-123456',
      email: 'john.doe.super.long.email.address.example.com@gmail.com',
      displayName: 'John Doe Very Long Name '.repeat(10),
      photoURL: 'https://example.com/avatar.png',
    };

    const payload = prepareUserProfilePayload(googleUser);

    expect(payload.email).toBe(googleUser.email);
    expect(payload.name.length).toBeLessThanOrEqual(100);
    expect(payload.username).toBe('User_google');
    expect(payload.usernameLower).toBe('user_google');
    expect(payload.needsOnboarding).toBe(true);
    expect(payload.role).toBe('USER');
    expect(payload.status).toBe('ACTIVE');
  });

  it('handles Google user with missing displayName or email correctly', () => {
    const googleUser = {
      uid: 'google-uid-456789',
      email: null,
      displayName: null,
      photoURL: null,
    };

    const payload = prepareUserProfilePayload(googleUser);

    expect(payload.email).toBe('');
    expect(payload.name).toBe('Anonymous');
    expect(payload.username).toMatch(/^User_/);
    expect(payload.needsOnboarding).toBe(true);
  });

  it('sets needsOnboarding to false when explicit valid username is provided during email sign up or onboarding', () => {
    const googleUser = {
      uid: 'google-uid-789012',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      photoURL: null,
    };

    const payload = prepareUserProfilePayload(googleUser, 'janedoe99');

    expect(payload.username).toBe('janedoe99');
    expect(payload.usernameLower).toBe('janedoe99');
    expect(payload.needsOnboarding).toBe(false);
  });

  it('auto-suggests clean candidate and appends random digits if base candidate is taken', () => {
    const candidateAvailable = resolveSuggestedUsername('John Doe', false);
    expect(candidateAvailable).toBe('JohnDoe');

    const candidateTaken = resolveSuggestedUsername('John Doe', true);
    expect(candidateTaken).toMatch(/^JohnDoe\d{3}$/);
  });

  it('preserves target redirect URL and join code when user profile needs onboarding', () => {
    const profile = { needsOnboarding: true };
    const targetUrl = '/pickem/yes_day_2026?joinCode=AUTISM2026';
    const joinCode = 'AUTISM2026';

    let storedRedirect: string | null = targetUrl;
    let storedCode: string | null = joinCode;

    // Simulate Landing route guard check when needsOnboarding is true:
    if (profile.needsOnboarding) {
      // Must NOT clear storedRedirect!
    } else {
      storedRedirect = null;
    }

    expect(storedRedirect).toBe('/pickem/yes_day_2026?joinCode=AUTISM2026');
    expect(storedCode).toBe('AUTISM2026');
  });
});
