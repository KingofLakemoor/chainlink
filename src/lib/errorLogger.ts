import { db, initFirebase } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logError(context: string, error: any) {
  try {
    let errorMsg = 'Unknown error';
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

    const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
    const url = typeof window !== 'undefined' && window.location ? (window.location.href || '') : '';

    if (!db) {
      await initFirebase().catch(() => {});
    }

    if (db) {
      await addDoc(collection(db, 'system_errors'), {
        context: context || 'Global Error',
        message: errorMsg,
        stack,
        timestamp: serverTimestamp(),
        userAgent,
        url
      });
    }

    // Fallback to console for standard debugging
    console.error(`[${context}]`, error);
  } catch (e) {
    // Failsafe: If the database write itself fails, we must output to console.
    console.error('Failed to log error to Firestore', e);
    console.error(`[ORIGINAL ERROR] [${context}]`, error);
  }
}
