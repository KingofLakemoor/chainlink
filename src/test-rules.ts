import { db } from './lib/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';

export async function testRules() {
  try {
    const snap = await getDocs(query(collection(db, 'system_errors'), limit(1)));
    console.log("TEST system_errors Success:", snap.size);
  } catch (e) {
    console.error("TEST system_errors Error:", e);
  }
}
