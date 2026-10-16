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

  it('supports active state', () => {
    render(<ToolbarButton active>Active</ToolbarButton>);
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  });

  it('supports disabled state', () => {
    render(<ToolbarButton disabled>Disabled</ToolbarButton>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
  });
});
