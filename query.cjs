const admin = require('firebase-admin');

// we don't have serviceAccountKey.json, let's use default credential or initializeApp if running inside cloud run environment. Wait, how do I authenticate?
// I can just check the firebase tools. Or I can check the firebase skill.
