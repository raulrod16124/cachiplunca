import { IconButton, Text, Tooltip } from '@raulrod/ui';
import { ChevronLeft, ChevronRight, X } from '@raulrod/icons';
import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import styled from 'styled-components';
import type { CanvasViewportStore } from '../../../../application/services';
import type { FrameElement } from '../../../../domain/element';
import { Bounds } from '../../../../domain/shared';
import { useI18n } from '../../../i18n';

export const PRESENTATION_FIT_PADDING = 64;

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: ${({ theme }) => theme.space[4]};
  pointer-events: none;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: -6px;
  }
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.canvas.surface};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  pointer-events: auto;
`;

const Counter = styled(Text)`
  min-width: 8ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
`;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

function hasOpenModal(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export interface BoardPresentationProps {
  readonly frame: FrameElement;
  readonly index: number;
  readonly total: number;
  readonly store: CanvasViewportStore;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onExit: () => void;
}

export function BoardPresentation({
  frame,
  index,
  total,
  store,
  onPrevious,
  onNext,
  onExit,
}: BoardPresentationProps): ReactNode {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const bounds = useMemo(() => Bounds.of(frame.position, frame.size), [frame]);
  const { width, height } = viewport.size;
  const isFirst = index <= 0;
  const isLast = index >= total - 1;

  useEffect(() => {
    store.fit(bounds, PRESENTATION_FIT_PADDING);
  }, [store, bounds, width, height]);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.repeat ||
        isEditableTarget(event.target) ||
        hasOpenModal()
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          event.preventDefault();
          event.stopPropagation();
          if (!isLast) {
            onNext();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          event.preventDefault();
          event.stopPropagation();
          if (!isFirst) {
            onPrevious();
          }
          break;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          onExit();
          break;
        default:
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isFirst, isLast, onExit, onNext, onPrevious]);

  return (
    <Overlay
      ref={rootRef}
      role="region"
      aria-label={t('presentation.title')}
      aria-keyshortcuts="ArrowLeft ArrowRight Escape"
      tabIndex={-1}
      data-testid="board-presentation"
    >
      <Bar>
        <Tooltip content={t('presentation.previous')} placement="top">
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            label={t('presentation.previous')}
            disabled={isFirst}
            onClick={onPrevious}
          >
            <ChevronLeft aria-hidden="true" size={16} />
          </IconButton>
        </Tooltip>
        <Counter role="status" aria-live="polite" size="font.size.sm" weight="font.weight.medium">
          {t('presentation.counter', { current: index + 1, total })}
        </Counter>
        <Tooltip content={t('presentation.next')} placement="top">
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            label={t('presentation.next')}
            disabled={isLast}
            onClick={onNext}
          >
            <ChevronRight aria-hidden="true" size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip content={t('presentation.exit')} placement="top">
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t('presentation.exit')}
            onClick={onExit}
          >
            <X aria-hidden="true" size={16} />
          </IconButton>
        </Tooltip>
      </Bar>
    </Overlay>
  );
}
