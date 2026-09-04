import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn(async (data: any) => ({ id: 'mock-doc-id', ...data }));
const mockCollection = vi.fn((colName: string) => ({
  add: mockAdd
}));

vi.mock('./firebase-admin.js', () => ({
  adminDb: {
    collection: (colName: string) => mockCollection(colName)
  }
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'MOCK_SERVER_TIMESTAMP'
  }
}));

import { logServerError } from './serverErrorLogger';

describe('logServerError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs Error instances to system_errors collection via adminDb', async () => {
    const err = new Error('Database connection failed');
    await logServerError('DB Connection', err);

    expect(mockCollection).toHaveBeenCalledWith('system_errors');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'DB Connection',
        message: 'Database connection failed',
        stack: expect.any(String),
        timestamp: 'MOCK_SERVER_TIMESTAMP',
        userAgent: 'Node.js Backend',
        url: 'Backend Service'
      })
    );
  });

  it('extracts userAgent and url from express request objects', async () => {
    const mockReq = {
      headers: { 'user-agent': 'Mozilla/5.0 Test' },
      originalUrl: '/api/test-endpoint'
    };
    await logServerError('API Route', 'Server error occurred', mockReq);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'API Route',
        message: 'Server error occurred',
        userAgent: 'Mozilla/5.0 Test',
        url: '/api/test-endpoint'
      })
    );
  });
});
