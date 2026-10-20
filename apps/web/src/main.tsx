import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@forge-org/tokens/tokens.css';
import './app/global.css';
import { App } from './app/App';
const host = document.getElementById('root');
if (!host) throw new Error('Missing #root');
createRoot(host).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
