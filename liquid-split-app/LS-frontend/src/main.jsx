import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/common.css'
import '../components/misc.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (err) {
  // Log and show a helpful error message in the page so the white screen is diagnosable
  // eslint-disable-next-line no-console
  console.error('App failed to render:', err);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `<div style="padding:24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111;background:#fff;"><h2 style="color:#b91c1c">Application failed to start</h2><pre style="white-space:pre-wrap;color:#111">${String(err && err.stack ? err.stack : err)}</pre></div>`;
  }
}
