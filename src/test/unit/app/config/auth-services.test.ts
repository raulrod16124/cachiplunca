import { createAuthServicesWithPort } from '../../../../app/config/auth-service-composition';
import type { AuthSignUpInput, AuthUser } from '../../../../application/ports';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

const USER: AuthUser = {
  uid: 'uid-1',
  email: 'user@example.com',
  emailVerified: false,
  displayName: 'Test User',
};

class QuietAuthPort extends FakeAuthPort {
  override async signUp(input: AuthSignUpInput): Promise<AuthUser> {
    return { ...USER, email: input.email, displayName: input.displayName };
  }

  override async updateDisplayName(displayName: string): Promise<AuthUser> {
    return { ...USER, displayName };
  }
}

describe('createAuthServicesWithPort', () => {
  it('applies the registered user to the session store', async () => {
    const services = createAuthServicesWithPort(new QuietAuthPort());
    services.sessionStore.subscribe(() => undefined);

    const result = await services.registerUser({
      email: 'user@example.com',
      password: 'secret123',
      displayName: 'New User',
    });

    expect(result.status).toBe('ok');
    expect(services.sessionStore.getSnapshot()).toEqual({
      status: 'authenticated',
      user: expect.objectContaining({ displayName: 'New User' }),
    });
  });

  it('applies the updated profile to the session store', async () => {
    const services = createAuthServicesWithPort(new QuietAuthPort());
    services.sessionStore.subscribe(() => undefined);

    const result = await services.updateUserProfile({ displayName: 'Grace Hopper' });

    expect(result.status).toBe('ok');
    expect(services.sessionStore.getSnapshot()).toEqual({
      status: 'authenticated',
      user: expect.objectContaining({ displayName: 'Grace Hopper' }),
    });
  });

  it('does not touch the session store when registration fails validation', async () => {
    const services = createAuthServicesWithPort(new QuietAuthPort());
    services.sessionStore.subscribe(() => undefined);

    const result = await services.registerUser({
      email: 'not-an-email',
      password: 'short',
      displayName: '',
    });

    expect(result.status).toBe('invalid-input');
    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'anonymous' });
  });
});
