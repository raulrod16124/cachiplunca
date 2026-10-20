import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { ToolbarButton } from '../../../../presentation/components/toolbar-button';

describe('ToolbarButton', () => {
  it('renders children and is interactive', () => {
    const onClick = jest.fn();
    render(<ToolbarButton onClick={onClick}>Move</ToolbarButton>);
    const btn = screen.getByRole('button', { name: 'Move' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses the ghost variant when idle and primary when active', () => {
    const { rerender } = render(<ToolbarButton>Idle</ToolbarButton>);
    expect(screen.getByRole('button', { name: 'Idle' })).toHaveClass('rr-button--ghost');

    rerender(<ToolbarButton active>Idle</ToolbarButton>);
    expect(screen.getByRole('button', { name: 'Idle' })).toHaveClass('rr-button--primary');
  });

  it('supports disabled state', () => {
    render(<ToolbarButton disabled>Disabled</ToolbarButton>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
  });
});
