import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');
const importStatement = "import { ToastProvider } from './components/ui/Toast';\n";
const newContent = importStatement + content.replace(
  /<AuthProvider>/,
  "<AuthProvider>\n      <ToastProvider>"
).replace(
  /<\/AuthProvider>/,
  "      </ToastProvider>\n    </AuthProvider>"
);
fs.writeFileSync('src/App.tsx', newContent);
