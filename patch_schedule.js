import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');
if (content.includes("adminDb.collection('brackets').where('status'")) {
    console.log("Looking for unbound schedule calls...");
}
