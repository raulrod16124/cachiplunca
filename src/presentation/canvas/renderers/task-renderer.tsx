import { CalendarDays, UserRound } from '@raulrod/icons';
import { Badge, Button, DropdownMenu } from '@raulrod/ui';
import { useId, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import { defaultElementSize, isTaskOverdue } from '../../../application/services';
import { isEmptyRichText, isTaskElement, TASK_STATUSES } from '../../../domain/element';
import type { RichTextDocument, TaskElement, TaskStatus } from '../../../domain/element';
import { Size } from '../../../domain/shared';
import { shortUserId } from '../../collaboration';
import { formatCalendarDate, useI18n } from '../../i18n';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';
import { TASK_STATUS_LABEL_KEYS, TASK_STATUS_META } from './task-status-meta';

const Content = styled.div<{ readonly $overdue: boolean }>`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.md};
  border-width: 1px;
  border-style: solid;
  border-color: ${({ $overdue, theme }) =>
    $overdue ? theme.color.border.danger : theme.canvas.elementBorderSoft};
  box-shadow: ${({ $overdue, theme }) =>
    $overdue ? `inset 3px 0 0 ${theme.color.border.danger}` : 'none'};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  cursor: pointer;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 0 0 auto;
  min-width: 0;
`;

const MainInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
`;

const MetaColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 48%;
  text-align: right;
`;

const Title = styled.div`
  flex: 0 0 auto;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  flex: 0 0 auto;
`;

const StatusTrigger = styled(DropdownMenu.Trigger)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radius.sm};
  }
`;

const Caret = styled.span`
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size['2xs']};
`;

const NotesRegion = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
  margin-top: auto;
`;

const NotesToggle = styled(Button)`
  align-self: flex-start;
  gap: 4px;
  margin-top: auto;
  padding: 0;
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size['2xs']};
  font-weight: ${({ theme }) => theme.font.weight.medium};

  &:hover {
    color: ${({ theme }) => theme.color.text.primary};
  }
`;

const NotesPanel = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size['2xs']};
`;

const Meta = styled.div<{ readonly $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  color: ${({ $danger, theme }) => ($danger ? theme.color.text.danger : theme.color.text.muted)};
  font-size: ${({ theme }) => theme.font.size['2xs']};
`;

const MetaIcon = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
`;

const MetaText = styled.span`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

function measureTaskContentHeight(
  content: HTMLElement,
  notesPanel?: HTMLElement | null,
): number | null {
  const header = content.querySelector<HTMLElement>('[data-task-header]');
  const headerHeight = header?.getBoundingClientRect().height ?? 0;

  if (headerHeight <= 0) {
    return null;
  }

  const contentStyle = window.getComputedStyle(content);
  const verticalChrome =
    (parseFloat(contentStyle.paddingTop) || 0) +
    (parseFloat(contentStyle.paddingBottom) || 0) +
    (parseFloat(contentStyle.borderTopWidth) || 0) +
    (parseFloat(contentStyle.borderBottomWidth) || 0);
  const contentGap = parseFloat(contentStyle.rowGap) || 0;

  let height = headerHeight + verticalChrome;

  const notesRegion = content.querySelector<HTMLElement>('[data-task-notes-region]');

  if (notesRegion !== null) {
    const toggle = notesRegion.querySelector<HTMLElement>('[data-task-notes-toggle]');
    const toggleHeight = toggle?.getBoundingClientRect().height ?? 0;

    if (toggleHeight > 0) {
      const regionGap = parseFloat(window.getComputedStyle(notesRegion).rowGap) || 0;

      height += contentGap + toggleHeight;

      if (notesPanel !== undefined && notesPanel !== null) {
        height += regionGap + notesPanel.scrollHeight;
      }
    }
  }

  return Math.ceil(height);
}

interface TaskStatusControlProps {
  readonly element: TaskElement;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
}

function TaskStatusControl({
  element,
  onUpdateElement,
}: TaskStatusControlProps): ReactElement | null {
  const { t } = useI18n();
  const meta = TASK_STATUS_META[element.status];
  const label = t(TASK_STATUS_LABEL_KEYS[element.status]);

  if (onUpdateElement === undefined) {
    return (
      <Badge variant={meta.variant} data-task-status-badge="true">
        {label}
      </Badge>
    );
  }

  const selectStatus = (status: TaskStatus): void => {
    if (status === element.status) {
      return;
    }

    onUpdateElement({ type: 'task', element, status });
  };

  return (
    <DropdownMenu>
      <StatusTrigger
        aria-label={t('task.statusChange', { status: label })}
        data-testid={`task-status-trigger-${element.id.value}`}
      >
        <Badge variant={meta.variant} data-task-status-badge="true">
          {label}
        </Badge>
        <Caret aria-hidden="true">▾</Caret>
      </StatusTrigger>
      <DropdownMenu.Content placement="bottom-start">
        {TASK_STATUSES.map((status) => (
          <DropdownMenu.Item
            key={status}
            data-task-status-option={status}
            onSelect={() => {
              selectStatus(status);
            }}
          >
            <Badge variant={TASK_STATUS_META[status].variant}>
              {t(TASK_STATUS_LABEL_KEYS[status])}
            </Badge>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

interface TaskNotesProps {
  readonly element: TaskElement;
  readonly document: RichTextDocument;
  readonly onResizeElement?: (element: TaskElement, size: Size) => void;
}

function TaskNotes({ element, document, onResizeElement }: TaskNotesProps): ReactElement {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const originalHeightRef = useRef<number | null>(null);
  const openRef = useRef(false);
  const latestRef = useRef({ element, onResizeElement });
  latestRef.current = { element, onResizeElement };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;

    if (panel === null) {
      return;
    }

    const { element: current, onResizeElement: resize } = latestRef.current;

    if (resize === undefined) {
      return;
    }

    const content = panel.closest<HTMLElement>('[data-element-content]');
    const fittedHeight = content === null ? null : measureTaskContentHeight(content, panel);

    if (fittedHeight !== null) {
      if (Math.abs(fittedHeight - current.size.height) >= 1) {
        resize(current, Size.create(current.size.width, fittedHeight));
      }

      return;
    }

    const overflow = panel.scrollHeight - panel.clientHeight;

    if (overflow <= 0) {
      return;
    }

    resize(current, Size.create(current.size.width, current.size.height + overflow));
  }, [open]);

  useEffect(() => {
    return () => {
      const originalHeight = originalHeightRef.current;
      const { element: current, onResizeElement: resize } = latestRef.current;

      if (openRef.current && originalHeight !== null && resize !== undefined) {
        resize(current, Size.create(current.size.width, originalHeight));
      }
    };
  }, []);

  const toggle = (): void => {
    const { element: current, onResizeElement: resize } = latestRef.current;

    if (open) {
      const originalHeight = originalHeightRef.current;

      openRef.current = false;
      setOpen(false);
      originalHeightRef.current = null;

      if (originalHeight !== null && resize !== undefined) {
        resize(current, Size.create(current.size.width, originalHeight));
      }

      return;
    }

    originalHeightRef.current = current.size.height;
    openRef.current = true;
    setOpen(true);
  };

  return (
    <NotesRegion data-task-notes-region="true">
      <NotesToggle
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        endIcon={
          <Caret aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
            ▾
          </Caret>
        }
        data-task-notes-toggle="true"
        data-testid={`task-notes-toggle-${element.id.value}`}
        onClick={toggle}
      >
        {t('canvas.notes')}
      </NotesToggle>
      {open ? (
        <NotesPanel
          ref={panelRef}
          id={panelId}
          role="region"
          aria-label={t('canvas.taskNotes')}
          data-task-notes="true"
        >
          <RichTextContent document={document} />
        </NotesPanel>
      ) : null}
    </NotesRegion>
  );
}

export function TaskRenderer({
  element,
  assigneeLabel,
  onUpdateElement,
  onResizeElement,
}: ElementRendererProps): ReactElement | null {
  const { t, locale } = useI18n();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!isTaskElement(element) || onResizeElement === undefined) {
      return;
    }

    const defaultSize = defaultElementSize('task');

    if (element.size.width !== defaultSize.width || element.size.height !== defaultSize.height) {
      return;
    }

    const content = contentRef.current;

    if (content === null) {
      return;
    }

    const fittedHeight = measureTaskContentHeight(content);

    if (fittedHeight === null || Math.abs(fittedHeight - element.size.height) < 1) {
      return;
    }

    onResizeElement(element, Size.create(element.size.width, fittedHeight));
  }, [element, onResizeElement]);

  if (!isTaskElement(element)) {
    return null;
  }

  const notes = element.notes;
  const overdue =
    element.status !== 'completed' &&
    element.dueDate !== undefined &&
    isTaskOverdue(element.dueDate);
  const dueDateLabel =
    element.dueDate === undefined ? null : formatCalendarDate(element.dueDate, locale);
  const assigneeText =
    element.assigneeId === undefined
      ? null
      : (assigneeLabel ?? shortUserId(element.assigneeId.value));
  const dueDateText =
    dueDateLabel === null
      ? null
      : overdue
        ? `${t('task.overdue')} · ${dueDateLabel}`
        : dueDateLabel;

  return (
    <Content
      ref={contentRef}
      data-element-content="true"
      data-element-type="task"
      data-task-status={element.status}
      data-task-overdue={overdue ? 'true' : undefined}
      $overdue={overdue}
    >
      <HeaderRow data-task-header="true">
        <MainInfo>
          <Title>
            <RichTextContent document={element.title} mode="inline" />
          </Title>
          <StatusRow>
            <TaskStatusControl element={element} onUpdateElement={onUpdateElement} />
          </StatusRow>
        </MainInfo>
        {assigneeText === null && dueDateText === null ? null : (
          <MetaColumn data-task-meta="true">
            {assigneeText === null ? null : (
              <Meta data-task-assignee="true" title={assigneeText}>
                <MetaIcon>
                  <UserRound aria-hidden="true" size={11} />
                </MetaIcon>
                <MetaText>{assigneeText}</MetaText>
              </Meta>
            )}
            {dueDateText === null ? null : (
              <Meta
                data-task-due-date="true"
                data-task-overdue={overdue ? 'true' : undefined}
                title={dueDateText}
                $danger={overdue}
              >
                <MetaIcon>
                  <CalendarDays aria-hidden="true" size={11} />
                </MetaIcon>
                <MetaText>{dueDateText}</MetaText>
              </Meta>
            )}
          </MetaColumn>
        )}
      </HeaderRow>
      {notes === undefined || isEmptyRichText(notes) ? null : (
        <TaskNotes element={element} document={notes} onResizeElement={onResizeElement} />
      )}
    </Content>
  );
}
