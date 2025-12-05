import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

console.log('React app starting...');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

console.log('React app rendered');
