import "dotenv/config";
import { app } from './src/lib/firebase.ts';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

async function test() {
  const storage = getStorage(app);
  const path = "602 Merch Banner.jpeg";
  try {
    const url = await getDownloadURL(ref(storage, path));
    console.log("Success:", url);
  } catch (e) {
    console.error("Error for", path, ":", e.message);
  }

  const path2 = "tee banner.png";
  try {
    const url = await getDownloadURL(ref(storage, path2));
    console.log("Success:", url);
  } catch (e) {
    console.error("Error for", path2, ":", e.message);
  }
}

test().then(() => process.exit(0));
