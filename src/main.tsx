import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import DemoWrapper from './components/sol/SolAgentDemo';

const rootElement = document.getElementById('sol-agent-root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DemoWrapper />
      <Analytics />
    </React.StrictMode>
  );
}
