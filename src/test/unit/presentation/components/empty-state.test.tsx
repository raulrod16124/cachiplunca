import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { EmptyState } from '../../../../presentation/components/empty-state';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('EmptyState', () => {
  it('renders with default title and status role', () => {
    render(<EmptyState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders description and action', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        title="No invitations"
        description="Invite someone to get started"
        actionLabel="Invite"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('No invitations')).toBeInTheDocument();
    expect(screen.getByText('Invite someone to get started')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders a primary action by default and supports an outline action', () => {
    const onAction = jest.fn();
    const { rerender } = render(
      <EmptyState title="No results" actionLabel="Clear" onAction={onAction} />,
    );

    expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('rr-button--primary');

    rerender(
      <EmptyState
        title="No results"
        actionLabel="Clear"
        actionVariant="outline"
        onAction={onAction}
      />,
    );

    expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('rr-button--outline');
  });

  it('renders with icon', () => {
    render(<EmptyState icon={<span>📋</span>} />);
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders the title as a heading at the requested level', () => {
    render(<EmptyState title="No workspaces yet" titleAs="h1" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'No workspaces yet' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('rr-heading');
  });

  it('renders an illustration as a decorative slot', () => {
    render(<EmptyState title="No workspaces yet" illustration={<span>★</span>} />);

    const illustration = screen.getByTestId('state-illustration');
    expect(illustration).toHaveAttribute('aria-hidden', 'true');
    expect(illustration).toHaveTextContent('★');
  });

  it('applies the brand tone and display title with tokens', () => {
    render(
      <EmptyState
        title="No workspaces yet"
        illustration={<span>★</span>}
        tone="brand"
        titleVariant="display"
      />,
    );

    const heading = screen.getByRole('heading', { name: 'No workspaces yet' });
    const displayStyle = heading.getAttribute('style') ?? '';
    const css = styleText();

    expect(displayStyle).toContain('font-family: var(--cach-font-display)');
    expect(displayStyle).toContain('font-weight: var(--rr-font-weight-regular)');
    expect(css).toContain('var(--cach-surface-empty)');
    expect(css).toContain('var(--cach-border-accent)');
    expect(css).toContain('var(--cach-icon-accent)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
