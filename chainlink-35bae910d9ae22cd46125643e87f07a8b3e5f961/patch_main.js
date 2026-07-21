const fs = require('fs');
const content = fs.readFileSync('src/main.tsx', 'utf8');
const replacement = `import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './lib/firebase.ts';

// Suppress known React warnings from Recharts about non-boolean attributes passed to SVG elements
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('for a non-boolean attribute')) {
    return;
  }
  originalConsoleError(...args);
};

initFirebase().catch(e => console.error("Firebase init failed", e)).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});`;
fs.writeFileSync('src/main.tsx', replacement);
