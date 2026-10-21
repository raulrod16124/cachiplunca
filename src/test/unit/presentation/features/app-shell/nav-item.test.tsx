import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../../../setup/render-with-theme';
import { NavItem } from '../../../../../presentation/features/app-shell/nav-item';

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

  it('omits aria-current on inactive items', () => {
    render(<NavItem href="#pending-invitations">Invitations</NavItem>);

    expect(screen.getByRole('link', { name: 'Invitations' })).not.toHaveAttribute('aria-current');
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
        href="#pending-invitations"
        aria-label="Invitations, 2 pending"
        badge={
          <span aria-hidden="true" data-testid="nav-badge">
            2
          </span>
        }
      >
        Invitations
      </NavItem>,
    );

    expect(screen.getByRole('link', { name: 'Invitations, 2 pending' })).toBeInTheDocument();
    expect(screen.getByTestId('nav-badge')).toHaveTextContent('2');
  });
});
