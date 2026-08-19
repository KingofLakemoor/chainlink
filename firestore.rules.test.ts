import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { setLogLevel } from 'firebase/firestore';

setLogLevel('error');
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'chainlink-security-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Security Spec', () => {
  it('1. Identity Spoofing Write (PickemPicks) - User A tries to create a Pick under User B', async () => {
    const db = testEnv.authenticatedContext('userA').firestore();
    const mockPick = { participantId: 'userB', matchupId: 'm1' };
    await assertFails(db.collection('pickemPicks').doc('p1').set(mockPick));
  });

  it('2. Privilege Escalation (User Update) - User A tries to add "role": "ADMIN"', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('userA').set({
        email: 'a@a.com', name: 'User A', role: 'USER', status: 'ACTIVE', createdAt: Date.now()
      });
    });
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('users').doc('userA').update({ role: 'ADMIN' }));
  });

  it('3. Ghost Field Injection (Matchup) - Admin tries to write a PickemMatchup with isSecret', async () => {
    const db = testEnv.authenticatedContext('adminA', { role: 'ADMIN' }).firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('adminA').set({ role: 'ADMIN' });
    });
    await assertFails(db.collection('pickemMatchups').doc('m1').set({ isSecret: true }));
  });

  it('4. Terminal State Tampering (PickemPicks) - User tries to change their Pick after startTime', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('pickemMatchups').doc('m1').set({ startTime: Date.now() - 10000 });
      await context.firestore().collection('pickemPicks').doc('p1').set({ participantId: 'userA', matchupId: 'm1' });
    });
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('pickemPicks').doc('p1').update({ newPick: 'teamB' }));
  });
  
  it('5. Denial of Wallet String Injection (Squads) - Admin sets a Squad description to a 2MB string', async () => {
    const db = testEnv.authenticatedContext('adminA', { role: 'ADMIN' }).firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('adminA').set({ role: 'ADMIN' });
    });
    const hugeString = 'a'.repeat(500 * 1024); // 2MB
    await assertFails(db.collection('squads').doc('s1').set({ description: hugeString }));
  });

  it('6. Cross-Tenant Write (CoinTransaction) - User A tries to log a deposit for User B', async () => {
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('coinTransactions').doc('tx1').set({ userId: 'userB', amount: 100 }));
  });

  it('7. Read-Scraping - Unauthenticated user tries to list users', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('users').get());
  });

  it('8. Owner Revocation (Squads) - A MEMBER tries to kick the OWNER out of the squad', async () => {
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('squads').doc('s1').collection('members').doc('ownerId').delete());
  });

  it('9. Fake Timestamp (Pick) - User submits pick with past createdAt', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('matchups').doc('m1').set({ startTime: Date.now() + 100000 });
    });
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('picks').doc('p1').set({
        userId: 'userA', matchupId: 'm1', pickId: 'p1', status: 'PENDING', active: true,
        createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000), updatedAt: Date.now()
    }));
  });

  it('10. Type Mismatch (Picks) - User passes boolean instead of object for pick', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('matchups').doc('m1').set({ startTime: Date.now() + 100000 });
    });
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('picks').doc('p1').set({
        userId: 'userA', matchupId: 'm1', pickId: 'p1', status: 'PENDING', active: true,
        createdAt: Date.now(), updatedAt: Date.now(), pick: true
    }));
  });

  it('11. Negative Coin Wagering - User wagers negative coins', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('matchups').doc('m1').set({ startTime: Date.now() + 100000 });
    });
    const db = testEnv.authenticatedContext('userA').firestore();
    await assertFails(db.collection('picks').doc('p1').set({
        userId: 'userA', matchupId: 'm1', pickId: 'p1', status: 'PENDING', active: true,
        createdAt: Date.now(), updatedAt: Date.now(), wager: -500
    }));
  });

  it('12. Array Expansion Attack - User tries to add 1000 strings to friends array', async () => {
    const db = testEnv.authenticatedContext('userA').firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('userA').set({
        email: 'a@a.com', name: 'User A', role: 'USER', status: 'ACTIVE', createdAt: Date.now(), friends: []
      });
    });
    const hugeArray = new Array(1000).fill('friendId');
    await assertFails(db.collection('users').doc('userA').update({ friends: hugeArray }));
  });
});
