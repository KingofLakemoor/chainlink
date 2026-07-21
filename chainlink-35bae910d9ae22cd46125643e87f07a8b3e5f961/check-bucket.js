import { initializeApp } from "firebase/app";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const storage = getStorage(app);

async function run() {
  const paths = [
    "Sponsors/scriptless.png",
    "602 Merch Banner.jpeg",
    "merch_level_one_tee.png"
  ];
  for (const path of paths) {
    try {
      const r = ref(storage, path);
      const url = await getDownloadURL(r);
      console.log(`Success ${path}:`, url);
    } catch (e) {
      console.error(`Error ${path}:`, e.message);
    }
  }
}
run();
