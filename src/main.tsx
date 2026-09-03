import React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './styles.css';
import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
