// Override confirm for AI Studio iframe environment
const originalConfirm = window.confirm;
window.confirm = (msg) => {
  if (window.self !== window.top) return true;
  return originalConfirm(msg);
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './lib/firebase.ts';

// Suppress known React warnings from Recharts about non-boolean attributes passed to SVG elements
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('for a non-boolean attribute') || args[0].includes('Received NaN'))) {
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.update();
    }
  });
}
