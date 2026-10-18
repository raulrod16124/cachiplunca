import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isTaskElement } from '../../../domain/element';
import type { TaskStatus } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';

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
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const StatusBadge = styled.span`
  align-self: flex-start;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.background.sunken};
  font-size: ${({ theme }) => theme.font.size['2xs']};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Meta = styled.div`
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size['2xs']};
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
      <Title>
        <RichTextContent document={element.title} mode="inline" />
      </Title>
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
