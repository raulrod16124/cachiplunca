import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@raulrod/tokens/styles.css';
import '@raulrod/ui/styles.css';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './presentation/components/error-boundary.tsx';
import { installGlobalErrorHandlers } from './presentation/providers/global-error-handlers.ts';

installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
