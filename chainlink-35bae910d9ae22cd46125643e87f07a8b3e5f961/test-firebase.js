import { initializeApp } from "firebase/app";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const storage = getStorage(app);
const url = "gs://chainlink-2-72590.firebasestorage.app/Sponsors/scriptless.png";

async function run() {
  try {
    const r = ref(storage, url);
    const downloadUrl = await getDownloadURL(r);
    console.log("Success:", downloadUrl);
  } catch (e) {
    console.error("Error with gs://:", e.message);
  }
}
run();
