import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorPage from './error-page';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorPage />
  </StrictMode>
);
