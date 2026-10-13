import { Text } from '@raulrod/ui';
import styled from 'styled-components';
import type { ReactNode } from 'react';

const ErrorText = styled(Text)`
  color: ${({ theme }) => theme.color.text.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export interface FieldErrorProps {
  message?: string;
}

export function FieldError({ message }: FieldErrorProps): ReactNode {
  if (!message) {
    return null;
  }
  return (
    <ErrorText role="alert" aria-live="polite">
      {message}
    </ErrorText>
  );
}
