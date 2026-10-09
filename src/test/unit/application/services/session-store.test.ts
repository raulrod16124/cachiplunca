import { createSessionStore } from '../../../../application/services';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };
const OTHER_CREDENTIALS = { email: 'other@example.com', password: 'secret123' };

describe('createSessionStore', () => {
  it('starts in the loading state before anyone subscribes', () => {
    const store = createSessionStore(new FakeAuthPort());

    expect(store.getSnapshot()).toEqual({ status: 'loading' });
  });

  it('does not touch the port until the first subscriber arrives', () => {
    const authPort = new FakeAuthPort();
    createSessionStore(authPort);

    expect(authPort.activeSessionListenerCount()).toBe(0);
  });

  it('resolves to anonymous when the port has no session', () => {
    const store = createSessionStore(new FakeAuthPort());
    const onChange = jest.fn();

    store.subscribe(onChange);

    expect(store.getSnapshot()).toEqual({ status: 'anonymous' });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('resolves to authenticated when the port reports a session', async () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);
    const onChange = jest.fn();

    store.subscribe(onChange);
    onChange.mockClear();
    const user = await authPort.signUp(CREDENTIALS);

    expect(store.getSnapshot()).toEqual({ status: 'authenticated', user });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable snapshot reference until the session actually changes', async () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);

    store.subscribe(() => undefined);
    const initialSnapshot = store.getSnapshot();
    expect(store.getSnapshot()).toBe(initialSnapshot);

    await authPort.signUp(CREDENTIALS);
    const authenticatedSnapshot = store.getSnapshot();
    expect(authenticatedSnapshot).toEqual({
      status: 'authenticated',
      user: expect.objectContaining({ email: CREDENTIALS.email }),
    });
    expect(store.getSnapshot()).toBe(authenticatedSnapshot);

    await authPort.signOut();
    const anonymousSnapshot = store.getSnapshot();
    expect(anonymousSnapshot).toEqual({ status: 'anonymous' });

    await authPort.signOut();
    expect(store.getSnapshot()).toBe(anonymousSnapshot);
  });

  it('shares one port subscription across subscribers and releases it with the last one', () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);

    const unsubscribeFirst = store.subscribe(() => undefined);
    const unsubscribeSecond = store.subscribe(() => undefined);
    expect(authPort.activeSessionListenerCount()).toBe(1);

    unsubscribeFirst();
    expect(authPort.activeSessionListenerCount()).toBe(1);

    unsubscribeSecond();
    expect(authPort.activeSessionListenerCount()).toBe(0);
  });

  it('stops notifying after the last subscriber unsubscribes', async () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);
    const onChange = jest.fn();

    store.subscribe(onChange)();
    onChange.mockClear();
    await authPort.signUp(CREDENTIALS);

    expect(onChange).not.toHaveBeenCalled();
    expect(authPort.activeSessionListenerCount()).toBe(0);
  });

  it('keeps the resolved snapshot and reuses a single port subscription across resubscribes', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    const store = createSessionStore(authPort);

    const unsubscribe = store.subscribe(() => undefined);
    const resolvedSnapshot = store.getSnapshot();
    unsubscribe();

    expect(authPort.activeSessionListenerCount()).toBe(0);
    expect(store.getSnapshot()).toBe(resolvedSnapshot);

    const onChange = jest.fn();
    store.subscribe(onChange);

    expect(authPort.activeSessionListenerCount()).toBe(1);
    expect(store.getSnapshot()).toBe(resolvedSnapshot);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('notifies subscribers when the session switches to a different user', async () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);

    store.subscribe(() => undefined);
    await authPort.signUp(CREDENTIALS);
    const onChange = jest.fn();
    store.subscribe(onChange);

    await authPort.signOut();
    await authPort.signUp(OTHER_CREDENTIALS);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual({
      status: 'authenticated',
      user: expect.objectContaining({ email: OTHER_CREDENTIALS.email }),
    });
  });

  it('stays anonymous when the port reports a session error without a session', () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);

    store.subscribe(() => undefined);
    expect(store.getSnapshot()).toEqual({ status: 'anonymous' });

    authPort.emitSessionError(
      createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'Connection lost.'),
    );

    expect(store.getSnapshot()).toEqual({ status: 'anonymous' });
  });

  it('falls back to anonymous when the port reports a session error while authenticated', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    const store = createSessionStore(authPort);
    const onChange = jest.fn();

    store.subscribe(onChange);
    onChange.mockClear();
    authPort.emitSessionError(
      createAppError('persistence', ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'Storage offline.'),
    );

    expect(store.getSnapshot()).toEqual({ status: 'anonymous' });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
