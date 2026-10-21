import { screen } from '@testing-library/react';
import { render } from '../../../../../setup/render-with-theme';
import { createNoteElement, createTextElement } from '../../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { BoardPrintView } from '../../../../../../presentation/features/workspace-shell/components/board-print-view';

const WORKSPACE_ID = WorkspaceId.create('ws-print');
const CREATED_BY = UserId.create('user-1');

function base(id: string) {
  return {
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: CREATED_BY,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
  };
}

describe('BoardPrintView', () => {
  it('renders the workspace name, export date and board elements', () => {
    render(
      <BoardPrintView
        workspaceName="Roadmap Q4"
        elements={[
          createTextElement({ ...base('text-1'), content: 'First milestone' }),
          createNoteElement({ ...base('note-1'), content: 'A printed note' }),
        ]}
        exportedAt={new Date('2026-10-19T12:00:00.000Z')}
      />,
    );

    const view = screen.getByTestId('board-print-view');
    expect(view).toHaveTextContent('Roadmap Q4');
    expect(view).toHaveTextContent('Exported on 2026-10-19');
    expect(view).toHaveTextContent('First milestone');
    expect(view).toHaveTextContent('A printed note');
    expect(screen.queryByTestId(/^element-type-label-/)).not.toBeInTheDocument();
  });

  it('shows an empty state when the board has no elements', () => {
    render(
      <BoardPrintView
        workspaceName="Empty board"
        elements={[]}
        exportedAt={new Date('2026-10-19T12:00:00.000Z')}
      />,
    );

    expect(screen.getByTestId('board-print-view')).toHaveTextContent(
      'This board has no elements to print.',
    );
  });
});
