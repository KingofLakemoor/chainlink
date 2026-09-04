import { adminDb } from './firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function logServerError(context: string, error: any, req?: any) {
  try {
    let errorMsg = 'Unknown server error';
    let stack = '';

    if (error instanceof Error) {
      errorMsg = error.message || String(error);
      stack = error.stack || '';
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else if (error && typeof error === 'object') {
      try {
        errorMsg = error.message ? String(error.message) : JSON.stringify(error);
      } catch (_) {
        errorMsg = String(error);
      }
      if (error.stack) {
        stack = String(error.stack);
      }
    } else if (error !== undefined && error !== null) {
      errorMsg = String(error);
    }

    const userAgent = req?.headers?.['user-agent'] || (typeof req === 'string' ? req : 'Node.js Backend');
    const url = req?.originalUrl || req?.url || 'Backend Service';

    if (adminDb) {
      await adminDb.collection('system_errors').add({
        context: context || 'Server Error',
        message: errorMsg,
        stack,
        timestamp: FieldValue.serverTimestamp(),
        userAgent,
        url
      });
    }

    console.error(`[SERVER ERROR] [${context}]`, error);
  } catch (e) {
    console.error('Failed to log server error to Firestore', e);
    console.error(`[ORIGINAL SERVER ERROR] [${context}]`, error);
  }
}
