import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// Need to find service account credentials or we can't run this.
// Wait, we can run it against the local API, or just use Firestore emulator if there's one?
// No, it's production firestore. I need to run a ts-node script through the existing firebase admin setup.
