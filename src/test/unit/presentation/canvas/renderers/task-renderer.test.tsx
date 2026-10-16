import { render, screen } from '@testing-library/react';
import { createTaskElement, createTextElement } from '../../../../../domain/element';
import type { TaskElement, TaskStatus } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, TaskRenderer } from '../../../../../presentation/canvas/renderers';

interface TaskOverrides {
  readonly status: TaskStatus;
  readonly assigneeId: string;
  readonly dueDate: Date;
}

function createElement(title: string, overrides: Partial<TaskOverrides> = {}): TaskElement {
  return createTaskElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(30, 40),
    size: Size.create(120, 80),
    title,
    status: overrides.status ?? 'todo',
    assigneeId:
      overrides.assigneeId === undefined ? undefined : UserId.create(overrides.assigneeId),
    dueDate: overrides.dueDate,
  });
}

describe('TaskRenderer', () => {
  it('renders the element title', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    expect(screen.getByText('Ship the MVP')).toBeInTheDocument();
  });

  it('exposes the content node with a data attribute and the status', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-element-type', 'task');
    expect(content).toHaveAttribute('data-task-status', 'todo');
  });

  it('renders every task status with its label', () => {
    const cases: ReadonlyArray<readonly [TaskStatus, string]> = [
      ['todo', 'Todo'],
      ['in_progress', 'In progress'],
      ['done', 'Done'],
    ];

    for (const [status, label] of cases) {
      const { unmount } = render(
        <TaskRenderer element={createElement('Ship the MVP', { status })} selected={false} />,
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(document.querySelector('[data-element-content]')).toHaveAttribute(
        'data-task-status',
        status,
      );

      unmount();
    }
  });

  it('renders the assignee when present', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', { assigneeId: 'user-2' })}
        selected={false}
      />,
    );

    const assignee = document.querySelector('[data-task-assignee]');
    expect(assignee).not.toBeNull();
    expect(assignee).toHaveTextContent('user-2');
  });

  it('does not render the assignee when absent', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    expect(document.querySelector('[data-task-assignee]')).toBeNull();
  });

  it('renders the due date in ISO format when present', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', { dueDate: new Date('2026-03-15T10:30:00.000Z') })}
        selected={false}
      />,
    );

    const dueDate = document.querySelector('[data-task-due-date]');
    expect(dueDate).not.toBeNull();
    expect(dueDate).toHaveTextContent('2026-03-15');
  });

  it('does not render the due date when absent', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    expect(document.querySelector('[data-task-due-date]')).toBeNull();
  });

  it('delimits the container with a soft border', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveStyle({ borderTopWidth: '1px', borderTopStyle: 'solid' });
  });

  it('returns null for a non-task element', () => {
    const text = createTextElement({
      id: ElementId.create('elem-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'text',
    });

    const { container } = render(<TaskRenderer element={text} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('delegates to the renderer through ElementView', () => {
    render(
      <ElementView
        element={createElement('Ship the MVP')}
        selected={false}
        renderers={{ task: TaskRenderer }}
      />,
    );

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper).toHaveTextContent('Ship the MVP');
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });
});
