import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../../../setup/render-with-theme';
import { NavItem } from '../../../../../presentation/features/app-shell/nav-item';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('NavItem', () => {
  it('marks the active item as the current page', () => {
    render(
      <NavItem href="#workspaces" active icon={<span aria-hidden="true">W</span>}>
        Workspaces
      </NavItem>,
    );

    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('uses the brand active surface, text and accent tokens without hardcoded colors', () => {
    render(
      <NavItem href="#section" active>
        Updates
      </NavItem>,
    );

    const css = styleText();
    expect(css).toContain('var(--cach-surface-nav-active)');
    expect(css).toContain('var(--cach-nav-active-text)');
    expect(css).toContain('var(--cach-nav-accent)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('omits aria-current on inactive items', () => {
    render(<NavItem href="#section">Updates</NavItem>);

    expect(screen.getByRole('link', { name: 'Updates' })).not.toHaveAttribute('aria-current');
  });

  it('renders router links for internal destinations', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <NavItem to="/profile" active>
          Profile
        </NavItem>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders an optional badge without changing the accessible name', () => {
    render(
      <NavItem
        href="#section"
        aria-label="Updates, 2 new"
        badge={
          <span aria-hidden="true" data-testid="nav-badge">
            2
          </span>
        }
      >
        Updates
      </NavItem>,
    );

    expect(screen.getByRole('link', { name: 'Updates, 2 new' })).toBeInTheDocument();
    expect(screen.getByTestId('nav-badge')).toHaveTextContent('2');
  });
});
