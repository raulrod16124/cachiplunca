import { Heading } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';

const TruncatedHeading = styled(Heading)`
  && {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-width: 0;
    max-width: min(36vw, 420px);
    font-size: ${({ theme }) => theme.font.size.sm};
    line-height: ${({ theme }) => theme.font.leading.tight};
  }
`;

export interface WorkspaceTitleFieldProps {
  readonly name: string;
}

export function WorkspaceTitleField({ name }: WorkspaceTitleFieldProps): ReactNode {
  return <TruncatedHeading as="h1">{name}</TruncatedHeading>;
}
