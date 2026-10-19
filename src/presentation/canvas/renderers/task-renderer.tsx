import { Badge, Button, DropdownMenu } from '@raulrod/ui';
import { useId, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import { isEmptyRichText, isTaskElement, TASK_STATUSES } from '../../../domain/element';
import type { RichTextDocument, TaskElement, TaskStatus } from '../../../domain/element';
import { Size } from '../../../domain/shared';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';
import { TASK_STATUS_META } from './task-status-meta';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.sm};
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.canvas.elementBorderSoft};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  cursor: pointer;
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
`;

const Caret = styled.span`
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size['2xs']};
`;

const NotesToggle = styled(Button)`
  align-self: flex-start;
  gap: 4px;
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

const Meta = styled.div`
  flex: 0 0 auto;
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size['2xs']};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

function formatDueDate(dueDate: Date): string {
  return dueDate.toISOString().slice(0, 10);
}

interface TaskStatusControlProps {
  readonly element: TaskElement;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
}

function TaskStatusControl({
  element,
  onUpdateElement,
}: TaskStatusControlProps): ReactElement | null {
  const meta = TASK_STATUS_META[element.status];

  if (onUpdateElement === undefined) {
    return (
      <Badge variant={meta.variant} data-task-status-badge="true">
        {meta.label}
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
        aria-label={`Task status: ${meta.label}. Change status`}
        data-testid={`task-status-trigger-${element.id.value}`}
      >
        <Badge variant={meta.variant} data-task-status-badge="true">
          {meta.label}
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
              {TASK_STATUS_META[status].label}
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

    const overflow = panel.scrollHeight - panel.clientHeight;

    if (overflow <= 0) {
      return;
    }

    const { element: current, onResizeElement: resize } = latestRef.current;

    resize?.(current, Size.create(current.size.width, current.size.height + overflow));
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
    <>
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
        data-testid={`task-notes-toggle-${element.id.value}`}
        onClick={toggle}
      >
        Notes
      </NotesToggle>
      {open ? (
        <NotesPanel
          ref={panelRef}
          id={panelId}
          role="region"
          aria-label="Task notes"
          data-task-notes="true"
        >
          <RichTextContent document={document} />
        </NotesPanel>
      ) : null}
    </>
  );
}

export function TaskRenderer({
  element,
  onUpdateElement,
  onResizeElement,
}: ElementRendererProps): ReactElement | null {
  if (!isTaskElement(element)) {
    return null;
  }

  const notes = element.notes;

  return (
    <Content data-element-content="true" data-element-type="task" data-task-status={element.status}>
      <Title>
        <RichTextContent document={element.title} mode="inline" />
      </Title>
      <StatusRow>
        <TaskStatusControl element={element} onUpdateElement={onUpdateElement} />
      </StatusRow>
      {notes === undefined || isEmptyRichText(notes) ? null : (
        <TaskNotes element={element} document={notes} onResizeElement={onResizeElement} />
      )}
      {element.assigneeId === undefined ? null : (
        <Meta data-task-assignee="true">{element.assigneeId.value}</Meta>
      )}
      {element.dueDate === undefined ? null : (
        <Meta data-task-due-date="true">{formatDueDate(element.dueDate)}</Meta>
      )}
    </Content>
  );
}
