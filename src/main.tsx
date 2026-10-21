import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@raulrod/tokens/styles.css';
import '@raulrod/ui/styles.css';
import './presentation/styles/brand/fonts.css';
import './presentation/styles/brand/brand-theme.css';
import './index.css';
import App from './App.tsx';
import { setPublicBasePath } from './presentation/config/public-base';
import { ErrorBoundary } from './presentation/components/error-boundary.tsx';
import { installGlobalErrorHandlers } from './presentation/providers/global-error-handlers.ts';

setPublicBasePath(import.meta.env.BASE_URL);

installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
