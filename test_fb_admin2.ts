import "dotenv/config";
import './src/lib/firebase-admin.ts';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

async function test() {
  const bucket = getStorage(getApps()[0]).bucket(firebaseConfig.storageBucket);
  
  const files = await bucket.getFiles();
  console.log("Files:");
  files[0].forEach(f => console.log(f.name));
}

test().then(() => process.exit(0)).catch(console.error);
