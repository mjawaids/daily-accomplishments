import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './styles/dailywins.css';
import { initGA } from './lib/analytics';
import { initInstall } from './lib/install';

// Initialize Google Analytics
initGA();

// Catch beforeinstallprompt whichever screen the visitor lands on (see lib/install.ts)
initInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
