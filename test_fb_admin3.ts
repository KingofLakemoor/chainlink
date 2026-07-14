import "dotenv/config";
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

async function test() {
  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId
  });
  
  const bucket = getStorage(app).bucket("chainlink-2-72590.firebasestorage.app");
  
  const files = await bucket.getFiles({ prefix: "tee" });
  console.log("Files:", files[0].map(f => f.name));
}

test().then(() => process.exit(0)).catch(console.error);
