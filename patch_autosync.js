import fs from 'fs';
let content = fs.readFileSync('src/services/autoSync.ts', 'utf8');

const oldLink4 = `const link4SegmentsSnap = await adminDb.collection('link4Segments').get();`;

// Firebase dates for Link4 are ISO strings, so querying by 'endTime' with a string compare is possible but tricky depending on the string format.
// Wait, in Firebase Admin, we can just fetch recent ones using limit since there are very few link4 segments.
// Or order by endTime desc limit 10.
const newLink4 = `// Only fetch recent segments to avoid downloading years of history
      const link4SegmentsSnap = await adminDb.collection('link4Segments').orderBy('endTime', 'desc').limit(10).get();`;

if (content.includes("const link4SegmentsSnap = await adminDb.collection('link4Segments').get();")) {
    content = content.replace(oldLink4, newLink4);
    fs.writeFileSync('src/services/autoSync.ts', content);
    console.log("Patched autoSync.ts");
}
