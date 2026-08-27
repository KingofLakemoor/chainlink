import { google } from 'googleapis';
import fs from 'fs';

async function run() {
  const auth = new google.auth.GoogleAuth({
    keyFile: '/tmp/sa.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
  });

  const client = await auth.getClient();
  const projectId = 'chainlink-2-72590';
  
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

  // 1. Create a ruleset
  console.log("Creating ruleset...");
  const createRulesetRes = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    method: 'POST',
    data: {
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    }
  });
  const rulesetName = (createRulesetRes.data as any).name;
  console.log("Created ruleset:", rulesetName);

  // 2. Update the release for default database
  console.log("Updating release...");
  const releaseName = `projects/${projectId}/releases/cloud.firestore`;
  try {
    await client.request({
      url: `https://firebaserules.googleapis.com/v1/${releaseName}`,
      method: 'PATCH',
      data: {
        name: releaseName,
        rulesetName: rulesetName
      }
    });
    console.log("Successfully updated release!");
  } catch (e: any) {
    if (e.response?.status === 404) {
      console.log("Release not found, creating it...");
      await client.request({
        url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
        method: 'POST',
        data: {
          name: releaseName,
          rulesetName: rulesetName
        }
      });
      console.log("Successfully created release!");
    } else {
      throw e;
    }
  }
}

run().catch(console.error);
