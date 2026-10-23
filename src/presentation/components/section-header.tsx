import { Heading, Stack, Text } from '@raulrod/ui';
import type { HeadingLevel } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';

const Description = styled(Text)`
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export interface SectionHeaderProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly titleAs?: HeadingLevel;
}

export function SectionHeader({
  title,
  description,
  titleAs = 'h3',
}: SectionHeaderProps): ReactNode {
  return (
    <Stack gap="space-1">
      <Heading as={titleAs}>{title}</Heading>
      {description === undefined ? null : (
        <Description color="color.text.muted" size="font.size.sm">
          {description}
        </Description>
      )}
    </Stack>
  );
}
