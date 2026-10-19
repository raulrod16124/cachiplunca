import {
  createUpdateUserProfile,
  validateUpdateUserProfileInput,
} from '../../../../application/commands';
import type { AuthUser } from '../../../../application/ports';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

describe('update user profile', () => {
  it('trims the display name and updates the session user', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'ada@example.com', password: 'secret123' });

    const result = await createUpdateUserProfile(authPort)({ displayName: '  Ada Lovelace  ' });

    expect(result).toEqual({
      status: 'ok',
      user: expect.objectContaining({ displayName: 'Ada Lovelace' }),
    });
  });

  it('rejects empty and over-long display names without calling the port', () => {
    expect(validateUpdateUserProfileInput({ displayName: '   ' })).toEqual({
      displayName: 'Enter your display name.',
    });
    expect(validateUpdateUserProfileInput({ displayName: 'a'.repeat(81) })).toEqual({
      displayName: 'Display names cannot exceed 80 characters.',
    });
  });

  it('maps port failures to an application error', async () => {
    class FailingAuthPort extends FakeAuthPort {
      async updateDisplayName(): Promise<AuthUser> {
        throw createAppError(
          'network',
          ERROR_CODES.NETWORK_REQUEST_FAILED,
          'The network connection was lost.',
        );
      }
    }

    const result = await createUpdateUserProfile(new FailingAuthPort())({ displayName: 'Ada' });

    expect(result.status).toBe('error');
  });
});
