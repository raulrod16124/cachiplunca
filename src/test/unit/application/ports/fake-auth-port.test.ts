import { FakeAuthPort } from '../../../fixtures/fake-auth-port';
import { ERROR_CODES } from '../../../../shared/errors';

describe('FakeAuthPort', () => {
  it('emits the current anonymous session once on subscribe', () => {
    const fake = new FakeAuthPort();
    const listener = jest.fn();

    fake.observeSession(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('signs up a new user, activates the session and returns the created AuthUser', async () => {
    const fake = new FakeAuthPort();
    const listener = jest.fn();
    fake.observeSession(listener);

    const user = await fake.signUp({ email: 'New@Example.com ', password: 'secret-1' });

    expect(user).toEqual({
      uid: 'fake-uid-1',
      email: 'New@Example.com ',
      emailVerified: false,
      displayName: null,
    });
    expect(listener).toHaveBeenLastCalledWith(user);
  });

  it('rejects signUp when the email is already registered, ignoring case and whitespace', async () => {
    const fake = new FakeAuthPort();
    await fake.signUp({ email: 'user@example.com', password: 'secret-1' });

    await expect(
      fake.signUp({ email: '  USER@example.com ', password: 'other-secret' }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      code: ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
    });
  });

  it('signs in with valid credentials and emits the session', async () => {
    const fake = new FakeAuthPort();
    const created = await fake.signUp({ email: 'user@example.com', password: 'secret-1' });
    await fake.signOut();
    const listener = jest.fn();
    fake.observeSession(listener);

    const user = await fake.signIn({ email: 'user@example.com', password: 'secret-1' });

    expect(user).toEqual(created);
    expect(listener).toHaveBeenLastCalledWith(created);
  });

  it('rejects signIn for an unknown email without opening a session', async () => {
    const fake = new FakeAuthPort();
    const listener = jest.fn();
    fake.observeSession(listener);

    await expect(
      fake.signIn({ email: 'ghost@example.com', password: 'secret-1' }),
    ).rejects.toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    });
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('rejects signIn with a wrong password without opening a session', async () => {
    const fake = new FakeAuthPort();
    await fake.signUp({ email: 'user@example.com', password: 'secret-1' });
    await fake.signOut();
    const listener = jest.fn();
    fake.observeSession(listener);

    await expect(
      fake.signIn({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    });
    expect(listener).toHaveBeenLastCalledWith(null);
  });

  it('signs out and emits the anonymous session', async () => {
    const fake = new FakeAuthPort();
    await fake.signUp({ email: 'user@example.com', password: 'secret-1' });
    const listener = jest.fn();
    fake.observeSession(listener);

    await fake.signOut();

    expect(listener).toHaveBeenLastCalledWith(null);
  });

  it('does not re-emit when signing out without an active session', async () => {
    const fake = new FakeAuthPort();
    const listener = jest.fn();
    fake.observeSession(listener);

    await fake.signOut();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not re-emit when signing in as the current session user', async () => {
    const fake = new FakeAuthPort();
    await fake.signUp({ email: 'user@example.com', password: 'secret-1' });
    const listener = jest.fn();
    fake.observeSession(listener);

    await fake.signIn({ email: 'user@example.com', password: 'secret-1' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener after its unsubscribe is called', async () => {
    const fake = new FakeAuthPort();
    const listener = jest.fn();
    const unsubscribe = fake.observeSession(listener);

    unsubscribe();
    await fake.signUp({ email: 'user@example.com', password: 'secret-1' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps notifying the remaining listeners after one unsubscribes', async () => {
    const fake = new FakeAuthPort();
    const first = jest.fn();
    const second = jest.fn();
    fake.observeSession(first)();
    fake.observeSession(second);

    await fake.signUp({ email: 'user@example.com', password: 'secret-1' });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
