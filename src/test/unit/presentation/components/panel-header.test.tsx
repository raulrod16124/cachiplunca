import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../setup/render-with-theme';
import { PanelHeader } from '../../../../presentation/components/panel-header';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('PanelHeader', () => {
  it('renders the title as a level 2 heading with icon, description and actions', () => {
    render(
      <PanelHeader
        icon={<span data-testid="panel-icon" />}
        title="Task plan"
        description="Sprint 12"
        actions={<button type="button">Filter</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Task plan' })).toBeInTheDocument();
    expect(screen.getByTestId('panel-icon')).toBeInTheDocument();
    expect(screen.getByText('Sprint 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('renders an accessible close button and calls onClose', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<PanelHeader title="Comments" onClose={onClose} closeLabel="Close comments" />);

    await user.click(screen.getByRole('button', { name: 'Close comments' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render a close button without onClose', () => {
    render(<PanelHeader title="Comments" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('supports a custom heading level and id', () => {
    render(<PanelHeader title="Members" titleAs="h3" titleId="members-title" />);

    const heading = screen.getByRole('heading', { level: 3, name: 'Members' });
    expect(heading).toHaveAttribute('id', 'members-title');
  });

  it('uses spacing and border tokens without hardcoded colors', () => {
    render(<PanelHeader title="Comments" description="Note: Planning" />);

    const css = styleText();
    expect(css).toContain('var(--rr-space-4)');
    expect(css).toContain('var(--rr-space-1)');
    expect(css).toContain('var(--rr-space-2)');
    expect(css).toContain('var(--rr-space-3)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
