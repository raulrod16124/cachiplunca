import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { render } from '../../../../setup/render-with-theme';
import type {
  ChangeUserEmail,
  ChangeUserPassword,
  UpdateUserProfile,
} from '../../../../../application/commands';
import type { SystemEnvironment, AuthUser } from '../../../../../application/ports';
import {
  createUserSettingsStore,
  type UserSettingsStore,
} from '../../../../../application/services/user-settings-store';
import { UserSettings } from '../../../../../domain/user-settings';
import { UserId } from '../../../../../domain/shared';
import {
  ProfileView,
  type ProfileTab,
} from '../../../../../presentation/features/profile/profile-view';
import { ProfileServicesProvider } from '../../../../../presentation/features/profile/profile-services-provider';
import { UserSettingsProvider } from '../../../../../presentation/providers/user-settings-provider';
import {
  SessionProvider,
  useSession,
} from '../../../../../presentation/providers/session-provider';
import { createAuthServicesWithPort } from '../../../../../app/config/auth-service-composition';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';

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

function ProfileHarness({
  initialTab = 'profile',
}: {
  readonly initialTab?: ProfileTab;
}): ReactNode {
  const [tab, setTab] = useState<ProfileTab>(initialTab);

  return <ProfileView currentUser={CURRENT_USER} tab={tab} onTabChange={setTab} />;
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

describe('ProfileView', () => {
  it('updates the display name from the profile tab', async () => {
    const services = renderWithProviders(<ProfileHarness />);

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
    const services = renderWithProviders(<ProfileHarness initialTab="security" />, {
      changeUserPassword: jest.fn(async () => ({
        status: 'invalid-input' as const,
        fieldErrors: { confirmPassword: 'Passwords do not match.' },
      })),
    });

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

  it('switches to the preferences tab', () => {
    renderWithProviders(<ProfileHarness />);

    fireEvent.click(screen.getByRole('tab', { name: 'Preferences' }));

    expect(screen.getByRole('tab', { name: 'Preferences' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('combobox', { name: 'Font size' })).toBeInTheDocument();
  });

  it('updates session consumers immediately when the display name changes', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({
      email: 'ada@example.com',
      password: 'secret123',
      displayName: 'Ada Lovelace',
    });
    const services = createAuthServicesWithPort(authPort);

    function SessionProfileHarness(): ReactNode {
      const session = useSession();
      const [tab, setTab] = useState<ProfileTab>('profile');

      if (session.status !== 'authenticated') {
        return null;
      }

      return <ProfileView currentUser={session.user} tab={tab} onTabChange={setTab} />;
    }

    render(
      <UserSettingsProvider store={createSettingsStore()} userId={UserId.create('user-1')}>
        <ProfileServicesProvider
          services={{
            updateUserProfile: services.updateUserProfile,
            changeUserEmail: services.changeUserEmail,
            changeUserPassword: services.changeUserPassword,
          }}
        >
          <SessionProvider store={services.sessionStore}>
            <SessionProfileHarness />
          </SessionProvider>
        </ProfileServicesProvider>
      </UserSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Grace Hopper' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeInTheDocument());
  });
});
