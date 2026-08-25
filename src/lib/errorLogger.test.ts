import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./firebase', () => {
  let mockDb: any = null;
  return {
    get db() {
      return mockDb;
    },
    initFirebase: vi.fn(async () => {
      mockDb = { type: 'firestore' };
    }),
    __setMockDb: (val: any) => {
      mockDb = val;
    }
  };
});

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, colName) => ({ db, colName })),
  addDoc: vi.fn(async (colRef, data) => ({ id: 'mock-error-id', ...data })),
  serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP')
}));

import { logError } from './errorLogger';
import { addDoc } from 'firebase/firestore';
import { initFirebase } from './firebase';
// @ts-ignore
import { __setMockDb } from './firebase';

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setMockDb(null);
  });

  it('initializes firebase if db is null and logs standard Error instance', async () => {
    const error = new Error('Test error message');
    await logError('TestContext', error);

    expect(initFirebase).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ colName: 'system_errors' }),
      expect.objectContaining({
        context: 'TestContext',
        message: 'Test error message',
        stack: expect.any(String),
        timestamp: 'MOCK_SERVER_TIMESTAMP'
      })
    );
  });

  it('handles string errors cleanly', async () => {
    __setMockDb({ type: 'firestore' });
    await logError('StringErrorContext', 'Something went wrong string');

    expect(initFirebase).not.toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ colName: 'system_errors' }),
      expect.objectContaining({
        context: 'StringErrorContext',
        message: 'Something went wrong string',
        stack: ''
      })
    );
  });

  it('handles custom rejection objects cleanly', async () => {
    __setMockDb({ type: 'firestore' });
    await logError('PromiseRejection', { reason: 'Network timeout', status: 500 });

    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ colName: 'system_errors' }),
      expect.objectContaining({
        context: 'PromiseRejection',
        message: '{"reason":"Network timeout","status":500}',
        stack: ''
      })
    );
  });
});
