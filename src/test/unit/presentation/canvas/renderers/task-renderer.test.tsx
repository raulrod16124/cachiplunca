import { fireEvent, render, screen } from '@testing-library/react';
import {
  createTaskElement,
  createTextElement,
  DEFAULT_TEXT_ALIGN,
} from '../../../../../domain/element';
import type { RichTextDocument, TaskElement, TaskStatus } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, TaskRenderer } from '../../../../../presentation/canvas/renderers';
import { formatCalendarDate } from '../../../../../presentation/i18n/format';

interface TaskOverrides {
  readonly status: TaskStatus;
  readonly assigneeId: string;
  readonly dueDate: Date;
  readonly notes: string;
}

function createElement(
  title: string | RichTextDocument,
  overrides: Partial<TaskOverrides> = {},
): TaskElement {
  return createTaskElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(30, 40),
    size: Size.create(120, 80),
    title,
    status: overrides.status ?? 'todo',
    notes: overrides.notes,
    assigneeId:
      overrides.assigneeId === undefined ? undefined : UserId.create(overrides.assigneeId),
    dueDate: overrides.dueDate,
  });
}

function mockTaskLayout(heights: {
  readonly header: number;
  readonly notesToggle: number;
}): () => void {
  const getBoundingClientRect = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      let height = 0;

      if (this.hasAttribute('data-task-header')) {
        height = heights.header;
      } else if (this.hasAttribute('data-task-notes-toggle')) {
        height = heights.notesToggle;
      }

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 100,
        bottom: height,
        width: 100,
        height,
        toJSON: () => ({}),
      } as DOMRect;
    });
  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  const getComputedStyle = jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element, pseudoElement) => {
      const style = originalGetComputedStyle(element, pseudoElement);

      return Object.assign(Object.create(style), {
        paddingTop: '12px',
        paddingBottom: '12px',
        borderTopWidth: '1px',
        borderBottomWidth: '1px',
        rowGap: '6px',
      });
    });

  return () => {
    getBoundingClientRect.mockRestore();
    getComputedStyle.mockRestore();
  };
}

describe('TaskRenderer', () => {
  it('fits a newly created default-size task to its content', () => {
    const restoreLayout = mockTaskLayout({ header: 50, notesToggle: 20 });

    try {
      const element = createTaskElement({
        id: ElementId.create('elem-1'),
        workspaceId: WorkspaceId.create('ws-1'),
        createdBy: UserId.create('user-1'),
        position: Position.create(30, 40),
        size: Size.create(220, 120),
        title: 'Ship the MVP',
        status: 'todo',
        notes: 'Wait for review',
      });
      const onResizeElement = jest.fn();

      render(<TaskRenderer element={element} selected={false} onResizeElement={onResizeElement} />);

      expect(onResizeElement).toHaveBeenCalledWith(element, Size.create(220, 102));
    } finally {
      restoreLayout();
    }
  });

  it('leaves a task with a custom size untouched', () => {
    const restoreLayout = mockTaskLayout({ header: 50, notesToggle: 20 });

    try {
      const element = createTaskElement({
        id: ElementId.create('elem-1'),
        workspaceId: WorkspaceId.create('ws-1'),
        createdBy: UserId.create('user-1'),
        position: Position.create(30, 40),
        size: Size.create(300, 200),
        title: 'Ship the MVP',
        status: 'todo',
        notes: 'Wait for review',
      });
      const onResizeElement = jest.fn();

      render(<TaskRenderer element={element} selected={false} onResizeElement={onResizeElement} />);

      expect(onResizeElement).not.toHaveBeenCalled();
    } finally {
      restoreLayout();
    }
  });

  it('grows to the full notes height when expanding', () => {
    const restoreLayout = mockTaskLayout({ header: 50, notesToggle: 20 });
    const scrollHeight = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(70);
    const element = createElement('Ship the MVP', { notes: 'Wait for review' });
    const onResizeElement = jest.fn();

    try {
      render(<TaskRenderer element={element} selected={false} onResizeElement={onResizeElement} />);

      fireEvent.click(screen.getByTestId('task-notes-toggle-elem-1'));

      expect(onResizeElement).toHaveBeenCalledWith(element, Size.create(120, 178));
    } finally {
      scrollHeight.mockRestore();
      restoreLayout();
    }
  });

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
      ['completed', 'Completed'],
      ['blocked', 'Blocked'],
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

  it('renders the due date as a localized calendar date', () => {
    const dueDate = new Date('2099-03-15T00:00:00.000Z');

    render(<TaskRenderer element={createElement('Ship the MVP', { dueDate })} selected={false} />);

    const dueDateNode = document.querySelector('[data-task-due-date]');
    expect(dueDateNode).not.toBeNull();
    expect(dueDateNode).toHaveTextContent(formatCalendarDate(dueDate, 'en'));
  });

  it('marks an overdue task with a red container accent and label', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', {
          dueDate: new Date('2020-03-15T00:00:00.000Z'),
        })}
        selected={false}
      />,
    );

    const content = document.querySelector('[data-element-content]');
    const dueDate = document.querySelector('[data-task-due-date]');
    expect(content).toHaveAttribute('data-task-overdue', 'true');
    expect(dueDate).toHaveAttribute('data-task-overdue', 'true');
    expect(dueDate).toHaveTextContent('Overdue');
  });

  it('does not mark a completed task as overdue', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', {
          status: 'completed',
          dueDate: new Date('2020-03-15T00:00:00.000Z'),
        })}
        selected={false}
      />,
    );

    expect(document.querySelector('[data-element-content]')).not.toHaveAttribute(
      'data-task-overdue',
    );
  });

  it('uses the provided assignee label when available', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', { assigneeId: 'user-2' })}
        selected={false}
        assigneeLabel="Grace Hopper"
      />,
    );

    expect(document.querySelector('[data-task-assignee]')).toHaveTextContent('Grace Hopper');
  });

  it('groups the assignee and due date in a metadata column', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', {
          assigneeId: 'user-2',
          dueDate: new Date('2099-03-15T00:00:00.000Z'),
        })}
        selected={false}
      />,
    );

    const meta = document.querySelector('[data-task-meta]');

    expect(meta).not.toBeNull();
    expect(meta?.querySelector('[data-task-assignee]')).not.toBeNull();
    expect(meta?.querySelector('[data-task-due-date]')).not.toBeNull();
  });

  it('does not render the due date when absent', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    expect(document.querySelector('[data-task-due-date]')).toBeNull();
  });

  it('renders a collapsed notes toggle when notes are present', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', { notes: 'Wait for review' })}
        selected={false}
      />,
    );

    const toggle = screen.getByTestId('task-notes-toggle-elem-1');

    expect(toggle).toHaveTextContent('Notes');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[data-task-notes]')).toBeNull();
    expect(screen.queryByText('Wait for review')).toBeNull();
  });

  it('expands and collapses the notes when the toggle is clicked', () => {
    render(
      <TaskRenderer
        element={createElement('Ship the MVP', { notes: 'Wait for review' })}
        selected={false}
      />,
    );

    const toggle = screen.getByTestId('task-notes-toggle-elem-1');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const notes = document.querySelector('[data-task-notes]');
    expect(notes).not.toBeNull();
    expect(notes).toHaveTextContent('Wait for review');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[data-task-notes]')).toBeNull();
  });

  it('grows the task when the notes overflow and restores it when collapsed', () => {
    const scrollHeight = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(160);
    const clientHeight = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(40);
    const element = createElement('Ship the MVP', { notes: 'Wait for review' });
    const onResizeElement = jest.fn();

    try {
      render(<TaskRenderer element={element} selected={false} onResizeElement={onResizeElement} />);

      const toggle = screen.getByTestId('task-notes-toggle-elem-1');

      fireEvent.click(toggle);

      expect(onResizeElement).toHaveBeenCalledWith(element, Size.create(120, 200));

      fireEvent.click(toggle);

      expect(onResizeElement).toHaveBeenLastCalledWith(element, Size.create(120, 80));
    } finally {
      scrollHeight.mockRestore();
      clientHeight.mockRestore();
    }
  });

  it('restores the original task size if it unmounts while notes are open', () => {
    const scrollHeight = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(160);
    const clientHeight = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(40);
    const element = createElement('Ship the MVP', { notes: 'Wait for review' });
    const onResizeElement = jest.fn();

    try {
      const { unmount } = render(
        <TaskRenderer element={element} selected={false} onResizeElement={onResizeElement} />,
      );

      fireEvent.click(screen.getByTestId('task-notes-toggle-elem-1'));
      unmount();

      expect(onResizeElement).toHaveBeenLastCalledWith(element, Size.create(120, 80));
    } finally {
      scrollHeight.mockRestore();
      clientHeight.mockRestore();
    }
  });

  it('does not render the notes toggle when notes are absent', () => {
    render(<TaskRenderer element={createElement('Ship the MVP')} selected={false} />);

    expect(document.querySelector('[data-task-notes]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Notes' })).toBeNull();
  });

  it('does not render the notes toggle when notes are empty', () => {
    render(
      <TaskRenderer element={createElement('Ship the MVP', { notes: '' })} selected={false} />,
    );

    expect(document.querySelector('[data-task-notes]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Notes' })).toBeNull();
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

  it('renders the title with inline marks', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [{ text: 'bold', marks: { bold: true } }, { text: ' title' }],
        },
      ],
    };

    const { container } = render(<TaskRenderer element={createElement(doc)} selected={false} />);

    expect(screen.getByText('bold')).toHaveStyle({ fontWeight: 700 });
    expect(container.textContent).toContain('bold title');
  });

  it('renders only the first text block of a multi-block title', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 3, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Plan' }] },
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'ignored' }] },
      ],
    };
    const element: TaskElement = { ...createElement('placeholder'), title: doc };

    render(<TaskRenderer element={element} selected={false} />);

    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.queryByText('ignored')).toBeNull();
  });

  it('never renders list blocks from a title document', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'listed' }] },
              ],
            },
          ],
        },
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'fallback title' }] },
      ],
    };
    const element: TaskElement = { ...createElement('placeholder'), title: doc };

    const { container } = render(<TaskRenderer element={element} selected={false} />);

    expect(screen.getByText('fallback title')).toBeInTheDocument();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('li')).toBeNull();
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
