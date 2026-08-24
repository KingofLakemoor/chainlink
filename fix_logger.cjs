const fs = require('fs');
let code = fs.readFileSync('src/lib/errorLogger.ts', 'utf8');

code = code.replace(
`    // Fallback to console for standard debugging
    console.error(\`[\${context}]\`, error);
  } catch (e) {
    // Failsafe: If the database write itself fails, we must output to console.
    console.error('Failed to log error to Firestore', e);
  }`,
`    // Fallback to console for standard debugging
    console.error(\`[\${context}]\`, error);
  } catch (e) {
    // Failsafe: If the database write itself fails, we must output to console.
    console.error('Failed to log error to Firestore', e);
    console.error(\`[ORIGINAL ERROR] [\${context}]\`, error);
  }`);

fs.writeFileSync('src/lib/errorLogger.ts', code);
