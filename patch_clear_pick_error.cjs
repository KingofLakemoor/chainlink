const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `    } catch (err: any) {
      console.error(err);
      alert('Failed to clear pick: ' + (err.message || String(err)));
    }`;

const repl = `    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Missing or insufficient permissions")) {
         alert('Missing Permissions: Your Firebase project needs delete permissions for pickemPicks.\\n\\nGo to Firebase Console -> Firestore -> Rules and ensure you have:\\n\\nmatch /pickemPicks/{pickId} {\\n  allow read, write, delete: if request.auth != null;\\n}');
      } else {
         alert('Failed to clear pick: ' + (err.message || String(err)));
      }
    }`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched handleClearPick error message");
} else {
  console.log("Could not find handleClearPick error message");
}
