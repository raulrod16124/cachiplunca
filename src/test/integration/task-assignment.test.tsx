import { fireEvent, screen, waitFor } from '@testing-library/react';
import { shortUserId } from '../../presentation/collaboration';
import { ElementId } from '../../domain/shared';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

describe('task assignment and due dates', () => {
  beforeAll(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('assigns a task, stores a due date and marks it overdue', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Assignment board');
    const owner = harness.currentUser;

    if (owner === null) {
      throw new Error('Expected an authenticated user');
    }

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Ship the MVP' },
    });
    fireEvent.click(screen.getByRole('combobox', { name: 'Assignee' }));
    fireEvent.click(
      await screen.findByRole('option', {
        name: owner.displayName ?? shortUserId(owner.uid),
      }),
    );
    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2020-03-15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(async () => {
      const elements = await harness.elementRepository.listByWorkspace(workspace.id);
      expect(elements).toHaveLength(1);
    });

    const [element] = await harness.elementRepository.listByWorkspace(workspace.id);
    expect(element?.type).toBe('task');

    if (element?.type !== 'task') {
      throw new Error('Expected a task element');
    }

    expect(element.assigneeId?.value).toBe(owner.uid);
    expect(element.dueDate?.toISOString()).toBe('2020-03-15T00:00:00.000Z');

    const item = await screen.findByTestId(`canvas-item-${element.id.value}`);
    expect(item).toHaveAttribute('data-element-type', 'task');
    expect(item.querySelector('[data-task-overdue="true"]')).not.toBeNull();
    expect(item).toHaveTextContent('Overdue');

    fireEvent.doubleClick(item);
    expect(screen.getByRole('combobox', { name: 'Assignee' })).toHaveTextContent(
      owner.displayName ?? shortUserId(owner.uid),
    );
    expect(screen.getByLabelText('Due date')).toHaveValue('2020-03-15');

    fireEvent.click(screen.getByRole('combobox', { name: 'Assignee' }));
    fireEvent.click(screen.getByRole('option', { name: 'Unassigned' }));
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      const stored = await harness.elementRepository.findById(ElementId.create(element.id.value));
      expect(stored?.type).toBe('task');
      if (stored?.type === 'task') {
        expect(stored.assigneeId).toBeUndefined();
        expect(stored.dueDate).toBeUndefined();
      }
    });

    await waitFor(() =>
      expect(
        screen
          .getByTestId(`canvas-item-${element.id.value}`)
          .querySelector('[data-task-overdue="true"]'),
      ).toBeNull(),
    );
  });
});
