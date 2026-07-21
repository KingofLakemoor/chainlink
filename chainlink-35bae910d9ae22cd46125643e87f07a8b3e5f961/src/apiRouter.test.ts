import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from './apiRouter.ts';
import { adminDb, adminAuth } from './lib/firebase-admin.ts';

vi.mock('./lib/firebase-admin.js', () => {
  return {
    adminDb: {
      collection: vi.fn(),
    },
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  };
});

// also mock services to prevent real scraping/grading
vi.mock('./services/scheduleProcessor.js', () => ({
  scrapeLeagueSchedules: vi.fn()
}));
vi.mock('./services/grader.js', () => ({
  gradeMatchups: vi.fn()
}));
vi.mock('./services/link4Grader.js', () => ({
  gradeLink4Matchups: vi.fn(),
  payoutLink4Segment: vi.fn()
}));

const app = express();
app.use(express.json());
app.use(apiRouter);

describe('apiRouter GET /users/check-username', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the validateAuth middleware to let the request through
    // validateAuth checks for Bearer token and calls verifyIdToken
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: 'test-user-id' });
  });

  it('should return 500 when adminDb query throws an error', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('Mock DB Error'));
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });

    (adminDb.collection as any).mockReturnValue({
      where: mockWhere
    });

    const response = await request(app)
      .get('/users/check-username?username=testuser')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
    expect(adminDb.collection).toHaveBeenCalledWith('users');
    expect(mockWhere).toHaveBeenCalledWith('usernameLower', '==', 'testuser');
  });

  it('should return exists: false when username is not provided', async () => {
    const response = await request(app)
      .get('/users/check-username')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: false });
  });

  it('should return exists: true when user is found', async () => {
    const mockGet = vi.fn().mockResolvedValue({ empty: false });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });

    (adminDb.collection as any).mockReturnValue({
      where: mockWhere
    });

    const response = await request(app)
      .get('/users/check-username?username=existinguser')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: true });
    expect(mockWhere).toHaveBeenCalledWith('usernameLower', '==', 'existinguser');
  });

  it('should return exists: false when user is not found', async () => {
    const mockGet = vi.fn().mockResolvedValue({ empty: true });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });

    (adminDb.collection as any).mockReturnValue({
      where: mockWhere
    });

    const response = await request(app)
      .get('/users/check-username?username=nonexistentuser')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: false });
    expect(mockWhere).toHaveBeenCalledWith('usernameLower', '==', 'nonexistentuser');
  });
});
