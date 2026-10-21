import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { ActionRow } from '../../../../presentation/components/action-row';
import { Card } from '../../../../presentation/components/card';
import { Panel } from '../../../../presentation/components/panel';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('ActionRow', () => {
  it('renders leading, content and trailing slots', () => {
    render(
      <ActionRow leading={<span>Ana</span>} trailing={<button type="button">Remove</button>}>
        Editor
      </ActionRow>,
    );

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('supports wrapping and start alignment through tokenized styles', () => {
    render(<ActionRow align="start" wrap aria-label="Invitation row" />);

    const css = styleText();
    expect(css).toContain('align-items:flex-start');
    expect(css).toContain('flex-wrap:wrap');
  });

  it('forwards semantics and attributes when rendered as another element', () => {
    const onClick = jest.fn();
    render(
      <ActionRow as="li" aria-label="Member row" className="custom-row" onClick={onClick}>
        Member
      </ActionRow>,
    );

    const row = screen.getByRole('listitem', { name: 'Member row' });
    expect(row).toHaveClass('custom-row');
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('composes with Card and Panel as an internal usage example', () => {
    render(
      <Panel aria-label="Collaborators">
        <Card padding="sm">
          <ActionRow leading={<span>Ana</span>} trailing={<button type="button">Remove</button>}>
            Editor
          </ActionRow>
        </Card>
      </Panel>,
    );

    expect(screen.getByRole('region', { name: 'Collaborators' })).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});
