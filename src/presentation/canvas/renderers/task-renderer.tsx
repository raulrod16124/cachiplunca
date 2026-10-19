import { Badge, DropdownMenu } from '@raulrod/ui';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import { isEmptyRichText, isTaskElement, TASK_STATUSES } from '../../../domain/element';
import type { TaskElement, TaskStatus } from '../../../domain/element';
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

const NotesBox = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size['2xs']};
`;

const NotesPlaceholder = styled.span`
  color: ${({ theme }) => theme.color.text.muted};
  font-style: italic;
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

export function TaskRenderer({
  element,
  onUpdateElement,
}: ElementRendererProps): ReactElement | null {
  if (!isTaskElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="task" data-task-status={element.status}>
      <Title>
        <RichTextContent document={element.title} mode="inline" />
      </Title>
      <StatusRow>
        <TaskStatusControl element={element} onUpdateElement={onUpdateElement} />
      </StatusRow>
      <NotesBox data-task-notes="true">
        {element.notes === undefined || isEmptyRichText(element.notes) ? (
          <NotesPlaceholder>Add a note…</NotesPlaceholder>
        ) : (
          <RichTextContent document={element.notes} />
        )}
      </NotesBox>
      {element.assigneeId === undefined ? null : (
        <Meta data-task-assignee="true">{element.assigneeId.value}</Meta>
      )}
      {element.dueDate === undefined ? null : (
        <Meta data-task-due-date="true">{formatDueDate(element.dueDate)}</Meta>
      )}
    </Content>
  );
}
