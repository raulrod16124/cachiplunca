import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isTaskElement } from '../../../domain/element';
import type { TaskStatus } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In progress',
  done: 'Done',
};

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  overflow: hidden;
  border-radius: var(--rr-radius-100, 4px);
  background-color: var(--rr-color-background-default, #ffffff);
  color: var(--rr-color-text-default, #0f172a);
  font-size: var(--rr-font-size-200, 14px);
  line-height: 1.4;
  cursor: pointer;
`;

const Title = styled.div`
  font-weight: 600;
  word-break: break-word;
`;

const StatusBadge = styled.span`
  align-self: flex-start;
  padding: 2px 6px;
  border-radius: var(--rr-radius-100, 4px);
  background-color: var(--rr-color-background-subtle, #f1f5f9);
  font-size: var(--rr-font-size-100, 12px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Meta = styled.div`
  color: var(--rr-color-text-subtle, #64748b);
  font-size: var(--rr-font-size-100, 12px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

function formatDueDate(dueDate: Date): string {
  return dueDate.toISOString().slice(0, 10);
}

export function TaskRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isTaskElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="task" data-task-status={element.status}>
      <Title>{element.title}</Title>
      <StatusBadge>{STATUS_LABELS[element.status]}</StatusBadge>
      {element.assigneeId === undefined ? null : (
        <Meta data-task-assignee="true">{element.assigneeId.value}</Meta>
      )}
      {element.dueDate === undefined ? null : (
        <Meta data-task-due-date="true">{formatDueDate(element.dueDate)}</Meta>
      )}
    </Content>
  );
}
