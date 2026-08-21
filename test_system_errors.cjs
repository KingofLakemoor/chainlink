const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    }
  });

  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  try {
    await unauthedDb.collection('system_errors').add({ message: "Test" });
    console.log("system_errors write succeeded!");
  } catch(e) {
    console.error("system_errors write failed:", e.message);
  }
  
  await testEnv.cleanup();
}
run();
