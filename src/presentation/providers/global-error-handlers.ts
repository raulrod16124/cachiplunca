export interface GlobalErrorHandlerOptions {
  readonly onError?: (error: unknown) => void;
  readonly onUnhandledRejection?: (reason: unknown) => void;
}

export function installGlobalErrorHandlers(options: GlobalErrorHandlerOptions = {}): () => void {
  const handleError = (event: ErrorEvent): void => {
    options.onError?.(event.error);
  };

  const handleRejection = (event: PromiseRejectionEvent): void => {
    options.onUnhandledRejection?.(event.reason);
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}
