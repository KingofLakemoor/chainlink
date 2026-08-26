import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const projectId = config.projectId;
const databaseId = config.firestoreDatabaseId;

async function run() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/system_errors`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
       console.error("Failed:", res.status, await res.text());
       process.exit(1);
    }
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
