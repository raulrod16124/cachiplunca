import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  createFirebaseAuthAdapter,
  mapFirebaseUserToAuthUser,
} from '../../../../infrastructure/firebase/firebase-auth-adapter';
import { ERROR_CODES } from '../../../../shared/errors';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

type AuthCallback = (user: User | null) => void;
type AuthErrorCallback = (error: Error) => void;

function makeAuth(): Auth {
  return {} as unknown as Auth;
}

function makeUser(
  overrides: Partial<{
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
  }> = {},
): User {
  return {
    uid: 'uid-1',
    email: 'user@example.com',
    emailVerified: false,
    displayName: null,
    ...overrides,
  } as unknown as User;
}

function makeCredential(user: User): UserCredential {
  return { user } as unknown as UserCredential;
}

describe('createFirebaseAuthAdapter', () => {
  const auth = makeAuth();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('signUp', () => {
    it('creates the account on the injected auth instance and maps the authenticated user', async () => {
      jest
        .mocked(createUserWithEmailAndPassword)
        .mockResolvedValue(
          makeCredential(
            makeUser({ uid: 'uid-42', email: 'new@example.com', displayName: 'New User' }),
          ),
        );
      const adapter = createFirebaseAuthAdapter(auth);

      const user = await adapter.signUp({ email: 'new@example.com', password: 'secret-1' });

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'new@example.com',
        'secret-1',
      );
      expect(user).toEqual({
        uid: 'uid-42',
        email: 'new@example.com',
        emailVerified: false,
        displayName: 'New User',
      });
    });

    it('rejects with a typed conflict error when the email is already in use', async () => {
      jest.mocked(createUserWithEmailAndPassword).mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Firebase: Error (auth/email-already-in-use).',
      });
      const adapter = createFirebaseAuthAdapter(auth);

      await expect(
        adapter.signUp({ email: 'taken@example.com', password: 'secret-1' }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
        message: 'The email address is already in use.',
      });
    });

    it('rejects with an unknown AppError when the failure has no provider code', async () => {
      jest.mocked(createUserWithEmailAndPassword).mockRejectedValue(new TypeError('boom'));
      const adapter = createFirebaseAuthAdapter(auth);

      await expect(
        adapter.signUp({ email: 'user@example.com', password: 'secret-1' }),
      ).rejects.toMatchObject({
        kind: 'unknown',
        code: ERROR_CODES.UNKNOWN_UNEXPECTED,
      });
    });
  });

  describe('signIn', () => {
    it('opens the session on the injected auth instance and maps the authenticated user', async () => {
      jest.mocked(signInWithEmailAndPassword).mockResolvedValue(makeCredential(makeUser()));
      const adapter = createFirebaseAuthAdapter(auth);

      const user = await adapter.signIn({ email: 'user@example.com', password: 'secret-1' });

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'user@example.com', 'secret-1');
      expect(user.uid).toBe('uid-1');
      expect(user.email).toBe('user@example.com');
    });

    it('rejects with a typed authorization error for invalid credentials', async () => {
      jest.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Firebase: Error (auth/invalid-credential).',
      });
      const adapter = createFirebaseAuthAdapter(auth);

      await expect(
        adapter.signIn({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toMatchObject({
        kind: 'authorization',
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: 'The credentials are not valid.',
      });
    });
  });

  describe('signOut', () => {
    it('signs out on the injected auth instance', async () => {
      jest.mocked(signOut).mockResolvedValue();
      const adapter = createFirebaseAuthAdapter(auth);

      await adapter.signOut();

      expect(signOut).toHaveBeenCalledWith(auth);
    });

    it('rejects with a typed network error when the underlying call fails', async () => {
      jest.mocked(signOut).mockRejectedValue({ code: 'auth/network-request-failed' });
      const adapter = createFirebaseAuthAdapter(auth);

      await expect(adapter.signOut()).rejects.toMatchObject({
        kind: 'network',
        code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      });
    });
  });

  describe('observeSession', () => {
    function captureSession(
      listener: jest.Mock,
      onError?: jest.Mock,
    ): {
      readonly next: AuthCallback;
      readonly error: AuthErrorCallback;
      readonly unsubscribe: jest.Mock;
    } {
      const unsubscribe = jest.fn();
      let next: AuthCallback | undefined;
      let error: AuthErrorCallback | undefined;

      jest.mocked(onAuthStateChanged).mockImplementation((_auth, nextOrObserver, errorHandler) => {
        if (typeof nextOrObserver !== 'function') {
          throw new Error('The adapter must subscribe with a function');
        }
        next = nextOrObserver;
        error = errorHandler as AuthErrorCallback | undefined;
        return unsubscribe;
      });

      const adapter = createFirebaseAuthAdapter(auth);
      adapter.observeSession(listener, onError);

      if (next === undefined || error === undefined) {
        throw new Error('onAuthStateChanged was not subscribed');
      }
      return { next, error, unsubscribe };
    }

    it('emits the mapped AuthUser for an authenticated Firebase user', () => {
      const listener = jest.fn();
      const { next } = captureSession(listener);

      next(makeUser({ uid: 'uid-7', email: 'active@example.com' }));

      expect(listener).toHaveBeenCalledWith({
        uid: 'uid-7',
        email: 'active@example.com',
        emailVerified: false,
        displayName: null,
      });
    });

    it('emits null for an anonymous session', () => {
      const listener = jest.fn();
      const { next } = captureSession(listener);

      next(null);

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('forwards observation failures as AppError through the optional error listener', () => {
      const onError = jest.fn();
      const { error } = captureSession(jest.fn(), onError);

      error(new Error('offline'));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'unknown', code: ERROR_CODES.UNKNOWN_UNEXPECTED }),
      );
    });

    it('does not throw when an observation failure arrives without an error listener', () => {
      const { error } = captureSession(jest.fn());

      expect(() => error(new Error('offline'))).not.toThrow();
    });

    it('returns the unsubscribe provided by the SDK', () => {
      const { unsubscribe } = captureSession(jest.fn());

      const result = createFirebaseAuthAdapter(auth).observeSession(jest.fn());
      result();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});

describe('mapFirebaseUserToAuthUser', () => {
  it('maps only the fields required by the application model', () => {
    const user = makeUser({
      uid: 'uid-9',
      email: 'mapped@example.com',
      emailVerified: true,
      displayName: 'Mapped',
    });

    expect(mapFirebaseUserToAuthUser(user)).toEqual({
      uid: 'uid-9',
      email: 'mapped@example.com',
      emailVerified: true,
      displayName: 'Mapped',
    });
  });

  it('preserves null values for optional profile fields', () => {
    const user = makeUser({ email: null, displayName: null });

    expect(mapFirebaseUserToAuthUser(user)).toEqual({
      uid: 'uid-1',
      email: null,
      emailVerified: false,
      displayName: null,
    });
  });
});
