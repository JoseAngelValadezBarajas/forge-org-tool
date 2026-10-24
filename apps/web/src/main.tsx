import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@corefoundry-labs/forge-tokens/tokens.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './app/global.css';
import { App } from './app/App';
import { installDesktopTransport } from './desktopTransport';

installDesktopTransport();

const host = document.getElementById('root');
if (!host) throw new Error('Missing #root');
createRoot(host).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
