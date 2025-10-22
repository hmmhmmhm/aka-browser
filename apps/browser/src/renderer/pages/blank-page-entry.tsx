import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BlankPage from './blank-page';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BlankPage />
  </StrictMode>
);
