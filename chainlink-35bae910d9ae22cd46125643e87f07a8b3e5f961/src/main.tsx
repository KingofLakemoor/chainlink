import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './lib/firebase.ts';

// Suppress known React warnings from Recharts about non-boolean attributes passed to SVG elements
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('for a non-boolean attribute')) {
    return;
  }
  originalConsoleError(...args);
};

initFirebase().catch(e => console.error("Firebase init failed", e)).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});