import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { ToolbarButton } from '../../../../presentation/components/toolbar-button';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('ToolbarButton', () => {
  it('renders children and is interactive', () => {
    const onClick = jest.fn();
    render(
      <ToolbarButton label="Move" onClick={onClick}>
        Move
      </ToolbarButton>,
    );
    const btn = screen.getByRole('button', { name: 'Move' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses the ghost variant when idle and primary when active', () => {
    const { rerender } = render(<ToolbarButton label="Idle">Idle</ToolbarButton>);
    expect(screen.getByRole('button', { name: 'Idle' })).toHaveClass('rr-icon-button--ghost');

    rerender(
      <ToolbarButton label="Idle" active>
        Idle
      </ToolbarButton>,
    );
    expect(screen.getByRole('button', { name: 'Idle' })).toHaveClass('rr-icon-button--primary');
  });

  it('uses the neutral sunken hover instead of the secondary action color', () => {
    render(<ToolbarButton label="Neutral">Neutral</ToolbarButton>);

    const css = styleText();
    expect(css).toContain('var(--cach-control-hover)');
    expect(css).not.toContain('var(--rr-color-action-secondary-background)');
  });

  it('uses the medium icon button size by default', () => {
    render(<ToolbarButton label="Default size">Default size</ToolbarButton>);

    expect(screen.getByRole('button', { name: 'Default size' })).toHaveClass(
      'rr-icon-button--size-md',
    );
  });

  it('supports disabled state', () => {
    render(
      <ToolbarButton label="Disabled" disabled>
        Disabled
      </ToolbarButton>,
    );
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
  });
});
