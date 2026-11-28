/**
 * React Application Entry
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
// Base tokens and shared classes load first so component styles stay authoritative.
import './styles/globals.css';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
