import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Google Maps Platform Quota Defense — Tier 1 (Auto-Provisioned Demo Key)
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

window.gm_authFailure = () => {
  window.dispatchEvent(
    new CustomEvent('gmp-quota-exceeded', {
      detail: { source: 'gm_authFailure', message: 'Google Maps authentication or quota check failed.' },
    })
  );
};

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  originalConsoleError(...args);
  const text = args
    .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
    .join(' ');
  if (
    text.includes('OverQuotaMapError') ||
    text.includes('QuotaExceededError') ||
    text.includes('ApiProjectMapError') ||
    text.includes('BillingNotEnabledMapError')
  ) {
    window.dispatchEvent(
      new CustomEvent('gmp-quota-exceeded', {
        detail: { source: 'console', message: text },
      })
    );
  }
};

createRoot(document.getElementById('root')!).render(<App />);
