import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import { I18nProvider } from './i18n/i18n-context';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
