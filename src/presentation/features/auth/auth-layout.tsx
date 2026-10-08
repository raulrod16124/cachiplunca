import type { ReactNode } from 'react';
import styled from 'styled-components';

const Screen = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Panel = styled.section`
  width: 100%;
  max-width: 420px;
`;

export interface AuthLayoutProps {
  readonly children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps): ReactNode {
  return (
    <Screen>
      <Panel>{children}</Panel>
    </Screen>
  );
}
