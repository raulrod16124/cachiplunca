import { Heading, Text } from '@raulrod/ui';
import type { HeadingLevel } from '@raulrod/ui';
import { X } from '@raulrod/icons';
import type { HTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';
import { ActionRow } from './action-row';
import { NeutralIconButton } from './neutral-controls';

const Header = styled(ActionRow)`
  padding: ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const Description = styled(Text)`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
`;

interface PanelHeaderBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly actions?: ReactNode;
  readonly titleAs?: HeadingLevel;
  readonly titleId?: string;
}

export type PanelHeaderProps = PanelHeaderBaseProps &
  (
    | { readonly onClose: () => void; readonly closeLabel: string }
    | { readonly onClose?: undefined; readonly closeLabel?: undefined }
  );

export function PanelHeader({
  title,
  description,
  icon,
  actions,
  titleAs = 'h2',
  titleId,
  onClose,
  closeLabel,
  ...rest
}: PanelHeaderProps): ReactNode {
  const trailing =
    actions === undefined && onClose === undefined ? undefined : (
      <Actions>
        {actions}
        {onClose === undefined ? null : (
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={closeLabel}
            onClick={onClose}
          >
            <X aria-hidden="true" size={16} />
          </NeutralIconButton>
        )}
      </Actions>
    );

  return (
    <Header align="start" trailing={trailing} {...rest}>
      <TitleGroup>
        <TitleRow>
          {icon}
          <Heading as={titleAs} id={titleId}>
            {title}
          </Heading>
        </TitleRow>
        {description === undefined ? null : (
          <Description color="color.text.muted" size="font.size.xs">
            {description}
          </Description>
        )}
      </TitleGroup>
    </Header>
  );
}
