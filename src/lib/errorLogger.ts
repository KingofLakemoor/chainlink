import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logError(context: string, error: any) {
  try {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    
    await addDoc(collection(db, 'system_errors'), {
      context,
      message: errorMsg,
      stack,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Fallback to console for standard debugging
    console.error(`[${context}]`, error);
  } catch (e) {
    // Failsafe: If the database write itself fails, we must output to console.
    console.error('Failed to log error to Firestore', e);
  }
}
