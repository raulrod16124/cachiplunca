import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { render } from '../../../../setup/render-with-theme';
import type {
  ChangeUserEmail,
  ChangeUserPassword,
  LogoutUser,
  UpdateUserProfile,
} from '../../../../../application/commands';
import type { SystemEnvironment, AuthUser } from '../../../../../application/ports';
import {
  createUserSettingsStore,
  type UserSettingsStore,
} from '../../../../../application/services/user-settings-store';
import { UserSettings } from '../../../../../domain/user-settings';
import { UserId } from '../../../../../domain/shared';
import { AccountMenu } from '../../../../../presentation/features/auth/account-menu';
import { ProfileModal } from '../../../../../presentation/features/profile/profile-modal';
import { ProfileServicesProvider } from '../../../../../presentation/features/profile/profile-services-provider';
import { UserSettingsProvider } from '../../../../../presentation/providers/user-settings-provider';

const CURRENT_USER: AuthUser = {
  uid: 'user-1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
};

const ENVIRONMENT: SystemEnvironment = {
  getReducedMotionPref: () => false,
  getLanguages: () => ['en-US'],
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

function createSettingsStore(): UserSettingsStore {
  return createUserSettingsStore(
    {
      getByUserId: async () => UserSettings.create({ userId: UserId.create('user-1') }),
      upsert: async (settings) => settings,
    },
    ENVIRONMENT,
  );
}

interface Services {
  readonly updateUserProfile: UpdateUserProfile;
  readonly changeUserEmail: ChangeUserEmail;
  readonly changeUserPassword: ChangeUserPassword;
}

function renderWithProviders(children: ReactNode, overrides: Partial<Services> = {}): Services {
  const services: Services = {
    updateUserProfile: jest.fn(async () => ({ status: 'ok' as const, user: CURRENT_USER })),
    changeUserEmail: jest.fn(async () => ({ status: 'ok' as const, user: CURRENT_USER })),
    changeUserPassword: jest.fn(async () => ({ status: 'ok' as const })),
    ...overrides,
  };

  render(
    <UserSettingsProvider store={createSettingsStore()} userId={UserId.create('user-1')}>
      <ProfileServicesProvider services={services}>{children}</ProfileServicesProvider>
    </UserSettingsProvider>,
  );

  return services;
}

describe('ProfileModal', () => {
  it('updates the display name from the profile tab', async () => {
    const services = renderWithProviders(
      <ProfileModal open onOpenChange={() => undefined} currentUser={CURRENT_USER} />,
    );

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveAccessibleDescription(
      'This is how collaborators see you.',
    );
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Grace Hopper' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(services.updateUserProfile).toHaveBeenCalledWith({ displayName: 'Grace Hopper' }),
    );
    expect(await screen.findByText('Display name updated.')).toBeInTheDocument();
  });

  it('renders field errors returned when the passwords do not match', async () => {
    const services = renderWithProviders(
      <ProfileModal open onOpenChange={() => undefined} currentUser={CURRENT_USER} />,
      {
        changeUserPassword: jest.fn(async () => ({
          status: 'invalid-input' as const,
          fieldErrors: { confirmPassword: 'Passwords do not match.' },
        })),
      },
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));
    const panel = screen.getByRole('tabpanel');
    fireEvent.change(within(panel).getByLabelText('Current password'), {
      target: { value: 'secret123' },
    });
    fireEvent.change(within(panel).getByLabelText('New password'), {
      target: { value: 'new-secret' },
    });
    fireEvent.change(within(panel).getByLabelText('Confirm new password'), {
      target: { value: 'other-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(services.changeUserPassword).toHaveBeenCalledTimes(1);
  });

  it('opens from the avatar bubble account menu', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    renderWithProviders(<AccountMenu currentUser={CURRENT_USER} logoutUser={logoutUser} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Profile' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Security' })).toBeInTheDocument();
  });
});
