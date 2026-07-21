import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('./lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user1' })
  },
  adminDb: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));

import { apiRouter } from './apiRouter';
import { adminAuth, adminDb } from './lib/firebase-admin';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('apiRouter picks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process cancel-pick and refund links if valid', async () => {
    let userLinks = 90;
    const updates: any = {};
    const deletes: any = [];

    const mockTransactionGet = vi.fn().mockImplementation((ref) => {
      const idStr = ref.id || ref.path;
      if (idStr === 'user1' || String(idStr).includes('user1') && !String(idStr).includes('matchup1')) {
        return Promise.resolve({ exists: true, data: () => ({ links: userLinks }), ref });
      }
      if (idStr === 'matchup1' || String(idStr).includes('matchup1') && !String(idStr).includes('user1')) {
        return Promise.resolve({
           exists: true,
           data: () => ({ active: true, status: 'STATUS_SCHEDULED' }),
           ref
        });
      }
      if (String(idStr).includes('user1_matchup1')) {
         return Promise.resolve({
            exists: true,
            data: () => ({ links: 10, status: 'PENDING' }),
            ref
         });
      }
      // Blanket return true if none matched just in case
      return Promise.resolve({ exists: true, data: () => ({ links: 10, status: 'PENDING' }), ref });
    });

    (adminDb.collection as any).mockImplementation((colName: string) => {
      return { doc: (id: string) => ({ id, path: `${colName}/${id}` }) };
    });

    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      await cb({
         get: mockTransactionGet,
         update: vi.fn((ref, data) => { updates[ref.path || ref.id] = data; }),
         delete: vi.fn((ref) => { deletes.push(ref.path || ref.id); }),
         set: vi.fn((ref, data) => {})
      });
    });

    const res = await request(app)
      .post('/api/picks/cancel-pick')
      .set('Authorization', 'Bearer token')
      .send({ matchupId: 'matchup1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(updates['users/user1']?.links).toBe(100);
    expect(deletes).toContain('picks/user1_matchup1');
  });

  it('should reject cancel-pick if matchup has started', async () => {
    const mockTransactionGet = vi.fn().mockImplementation((ref) => {
      const idStr = ref.id || ref.path;
      if (idStr === 'user1' || String(idStr).includes('user1') && !String(idStr).includes('matchup1')) {
        return Promise.resolve({ exists: true, data: () => ({ links: 90 }) });
      }
      if (idStr === 'matchup1' || String(idStr).includes('matchup1') && !String(idStr).includes('user1')) {
        return Promise.resolve({
           exists: true,
           data: () => ({ active: true, status: 'STATUS_IN_PROGRESS' })
        });
      }
      if (String(idStr).includes('user1_matchup1')) {
         return Promise.resolve({
            exists: true,
            data: () => ({ links: 10, status: 'PENDING' }),
            ref
         });
      }
      return Promise.resolve({ exists: true, data: () => ({ links: 10, status: 'PENDING' }), ref });
    });

    (adminDb.collection as any).mockImplementation((colName: string) => {
      return { doc: (id: string) => ({ id, path: `${colName}/${id}` }) };
    });

    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      await cb({ get: mockTransactionGet });
    });

    const res = await request(app)
      .post('/api/picks/cancel-pick')
      .set('Authorization', 'Bearer token')
      .send({ matchupId: 'matchup1' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Matchup has already started');
  });

});
