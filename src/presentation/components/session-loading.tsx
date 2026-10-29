import type { ReactNode } from 'react';
import { FullPageLoading } from './full-page-loading';

export function SessionLoading(): ReactNode {
  return <FullPageLoading messageKey="session.restoring" />;
}
