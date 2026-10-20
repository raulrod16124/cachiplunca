import { Text } from '@raulrod/ui';
import styled from 'styled-components';
import type { ReactNode } from 'react';

const ErrorText = styled(Text)`
  color: ${({ theme }) => theme.color.text.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export interface FieldErrorProps {
  message?: string;
  id?: string;
}

export function FieldError({ message, id }: FieldErrorProps): ReactNode {
  if (!message) {
    return null;
  }
  return (
    <ErrorText id={id} role="alert" aria-live="polite">
      {message}
    </ErrorText>
  );
}
