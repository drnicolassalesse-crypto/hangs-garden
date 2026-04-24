import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { seedIfNeeded } from './data/seeders';
import { syncNotifications } from './services/notifications';
import { getLocale } from './i18n';

document.documentElement.lang = getLocale();

seedIfNeeded()
  .catch((err) => console.error('Species seed failed', err))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
    );
    // Best-effort reminder sync; permission may be absent (then it's a no-op).
    void syncNotifications();
  });
