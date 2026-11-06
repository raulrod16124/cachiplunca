import { MessageSquare, X } from '@raulrod/icons';
import { Button, IconButton, Portal } from '@raulrod/ui';
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import type { Notification } from '../../../../domain/notification';
import { respectReducedMotion } from '../../../styles';
import { useI18n } from '../../../i18n';

const DEFAULT_DURATION_MS = 6000;

const enter = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
`;

const Viewport = styled.div`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + ${({ theme }) => theme.space[4]});
  inset-inline: ${({ theme }) => theme.space[3]};
  z-index: ${({ theme }) => theme.z.toast};
  display: flex;
  justify-content: center;
  pointer-events: none;
`;

const Surface = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  max-width: 26rem;
  padding: ${({ theme }) => theme.space[3]};
  border: 1px solid ${({ theme }) => theme.color.border.strong};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.background.surface};
  color: ${({ theme }) => theme.color.text.primary};
  box-shadow: ${({ theme }) => theme.shadow.md};
  pointer-events: auto;
  animation: ${enter} ${({ theme }) => theme.motion.duration.base}
    ${({ theme }) => theme.motion.easing.enter};
  ${respectReducedMotion}
`;

const IconBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.background.info};
  color: ${({ theme }) => theme.color.text.info};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
`;

const Title = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: ${({ theme }) => theme.font.leading.normal};
  letter-spacing: ${({ theme }) => theme.font.tracking.normal};
`;

const Preview = styled.p`
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: ${({ theme }) => theme.font.leading.normal};
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: ${({ theme }) => theme.space[1]};
`;

export interface NotificationToastProps {
  readonly notification: Notification;
  readonly onOpen: () => void;
  readonly onDismiss: () => void;
  readonly durationMs?: number;
}

export function NotificationToast({
  notification,
  onOpen,
  onDismiss,
  durationMs = DEFAULT_DURATION_MS,
}: NotificationToastProps): ReactNode {
  const { t } = useI18n();
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onDismissRef.current();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [durationMs, notification.id.value, paused]);

  const handleBlur = (event: FocusEvent<HTMLElement>): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return;
    }

    setFocused(false);
  };

  return (
    <Portal>
      <Viewport>
        <Surface
          role="status"
          aria-label={t('notifications.toast.label')}
          aria-atomic="true"
          data-testid="notification-toast"
          onMouseEnter={() => {
            setHovered(true);
          }}
          onMouseLeave={() => {
            setHovered(false);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={handleBlur}
        >
          <IconBadge aria-hidden="true">
            <MessageSquare size={18} />
          </IconBadge>
          <Body>
            <Title>
              {t('notifications.comment.summary', {
                actor: notification.actorName,
                workspace: notification.workspaceName,
              })}
            </Title>
            <Preview>{notification.bodyPreview}</Preview>
            <Actions>
              <Button type="button" variant="link" size="sm" onClick={onOpen}>
                {t('notifications.toast.open')}
              </Button>
            </Actions>
          </Body>
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t('notifications.toast.dismiss')}
            onClick={onDismiss}
          >
            <X size={16} />
          </IconButton>
        </Surface>
      </Viewport>
    </Portal>
  );
}
