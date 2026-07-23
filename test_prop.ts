import { adminDb } from './src/lib/firebase-admin.js';
import { updateAllProps } from './src/services/propGrader.js';

async function main() {
    console.log("Updating all props...");
    await updateAllProps();
    console.log("Finished updating props.");
    
    // Check prop status
    const propId = "prop_builder_1784830497147_4346117_40912";
    const doc = await adminDb.collection("matchups").doc(propId).get();
    console.log(JSON.stringify(doc.data(), null, 2));
}

main().catch(console.error);
