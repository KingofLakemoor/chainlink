import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = "import { useNotifications } from './hooks/useNotifications';\n";

const newComponent = `function GlobalEffects() {
  useNotifications();
  return null;
}\n\n`;

let newContent = content.replace("export default function App() {", newComponent + "export default function App() {");
newContent = newContent.replace("<BrowserRouter>", "<BrowserRouter>\n        <GlobalEffects />");
newContent = newContent.replace("  useNotifications();\n", "");

fs.writeFileSync('src/App.tsx', importStatement + newContent);
