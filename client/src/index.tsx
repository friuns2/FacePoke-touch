import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { App } from './app';
// Add touch support polyfill
import 'react-touch-events';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
