import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoWrapper from './components/sol/SolAgentDemo';

const rootElement = document.getElementById('sol-agent-root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DemoWrapper />
    </React.StrictMode>
  );
}
