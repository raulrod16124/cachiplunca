import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { ErrorState } from './error-state';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface DefaultErrorFallbackProps {
  readonly error: Error | null;
  readonly onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps): ReactNode {
  const { t } = useI18n();

  return (
    <ErrorState
      description={error?.message}
      actionLabel={t('common.tryAgain')}
      onAction={onReset}
    />
  );
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
