const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, cert } = require('firebase-admin/app');
// Actually since we don't have service account, we can just hit the API or add a temp route.
