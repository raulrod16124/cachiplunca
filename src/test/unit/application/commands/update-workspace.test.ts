import {
  createUpdateWorkspace,
  validateUpdateWorkspaceInput,
  type UpdateWorkspaceResult,
} from '../../../../application/commands';
import { UserId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const CREATED_BY = UserId.create('user-1');
const VALID_ID = 'ws-1';

describe('validateUpdateWorkspaceInput', () => {
  it('returns no errors for a name-only update', () => {
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, name: 'New name' })).toEqual({});
  });

  it('returns no errors for a description-only update', () => {
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, description: 'Details' })).toEqual({});
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, description: null })).toEqual({});
  });

  it('returns no errors for a type-only update', () => {
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, type: 'travel' })).toEqual({});
  });

  it('rejects empty and whitespace-only ids', () => {
    expect(validateUpdateWorkspaceInput({ id: '' }).id).toBe('Enter a workspace id.');
    expect(validateUpdateWorkspaceInput({ id: '   ', name: 'Name' }).id).toBe(
      'Enter a workspace id.',
    );
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, name: '' }).name).toBe(
      'Enter a board name.',
    );
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, name: '   ' }).name).toBe(
      'Enter a board name.',
    );
  });

  it('rejects names above the maximum length', () => {
    const errors = validateUpdateWorkspaceInput({ id: VALID_ID, name: 'x'.repeat(101) });
    expect(errors.name).toBe('Board name must be at most 100 characters.');
  });

  it('accepts names at the exact maximum length', () => {
    expect(validateUpdateWorkspaceInput({ id: VALID_ID, name: 'x'.repeat(100) })).toEqual({});
  });

  it('accepts a complete cover image update and rejects half a pair', () => {
    expect(
      validateUpdateWorkspaceInput({
        id: VALID_ID,
        coverImageUrl: 'https://storage.test/cover.png',
        coverImageStoragePath: 'workspaces/ws-1/images/cover.png',
      }),
    ).toEqual({});
    expect(
      validateUpdateWorkspaceInput({
        id: VALID_ID,
        coverImageUrl: null,
        coverImageStoragePath: null,
      }),
    ).toEqual({});
    expect(
      validateUpdateWorkspaceInput({
        id: VALID_ID,
        coverImageUrl: 'https://storage.test/cover.png',
      }).cover,
    ).toBe('Provide both cover image URL and storage path.');
    expect(
      validateUpdateWorkspaceInput({
        id: VALID_ID,
        coverImageStoragePath: 'workspaces/ws-1/images/cover.png',
      }).cover,
    ).toBe('Provide both cover image URL and storage path.');
  });

  it('rejects an update without any updatable field', () => {
    const errors = validateUpdateWorkspaceInput({ id: VALID_ID });
    expect(errors.form).toBe('Provide at least one field to update.');
  });
});

describe('createUpdateWorkspace', () => {
  it('updates the name with the trimmed value, preserving id and createdAt', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ createdBy: CREATED_BY, name: 'Original' });
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: created.id.value, name: '  Renamed  ' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.id.equals(created.id)).toBe(true);
      expect(result.workspace.name).toBe('Renamed');
      expect(result.workspace.createdAt.getTime()).toBe(created.createdAt.getTime());
      expect(result.workspace.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
      expect(result.workspace).not.toBe(created);
    }
  });

  it('updates the type on its own', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ createdBy: CREATED_BY, name: 'Board' });
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: created.id.value, type: 'tasks' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.type).toBe('tasks');
      expect(result.workspace.name).toBe('Board');
    }
  });

  it('sets and clears the description with an explicit null', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({
      createdBy: CREATED_BY,
      name: 'Original',
      description: 'Previous',
    });
    const updateWorkspace = createUpdateWorkspace(repository);

    const withDescription = await updateWorkspace({
      id: created.id.value,
      description: 'Shared plan',
    });
    expect(withDescription.status).toBe('ok');
    if (withDescription.status === 'ok') {
      expect(withDescription.workspace.description).toBe('Shared plan');
      expect(withDescription.workspace.name).toBe('Original');
    }

    const withNull = await updateWorkspace({ id: created.id.value, description: null });
    expect(withNull.status).toBe('ok');
    if (withNull.status === 'ok') {
      expect(withNull.workspace.description).toBeNull();
    }
  });

  it('keeps omitted fields untouched', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({
      createdBy: CREATED_BY,
      name: 'Original',
      description: 'Keep me',
    });
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: created.id.value, name: 'Renamed' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.name).toBe('Renamed');
      expect(result.workspace.description).toBe('Keep me');
    }
  });

  it('updates and clears the cover image', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ createdBy: CREATED_BY, name: 'Original' });
    const updateWorkspace = createUpdateWorkspace(repository);

    const withCover = await updateWorkspace({
      id: created.id.value,
      coverImageUrl: 'https://storage.test/cover.png',
      coverImageStoragePath: `workspaces/${created.id.value}/images/cover.png`,
    });
    expect(withCover.status).toBe('ok');
    if (withCover.status === 'ok') {
      expect(withCover.workspace.coverImageUrl).toBe('https://storage.test/cover.png');
    }

    const cleared = await updateWorkspace({
      id: created.id.value,
      coverImageUrl: null,
      coverImageStoragePath: null,
    });
    expect(cleared.status).toBe('ok');
    if (cleared.status === 'ok') {
      expect(cleared.workspace.coverImageUrl).toBeNull();
      expect(cleared.workspace.coverImageStoragePath).toBeNull();
    }
  });

  it('accepts an id with surrounding whitespace', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ createdBy: CREATED_BY, name: 'Original' });
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: `  ${created.id.value}  `, name: 'Renamed' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.id.equals(created.id)).toBe(true);
    }
  });

  it('does not call the repository when input is invalid', async () => {
    const repository = new FakeWorkspaceRepository();
    const update = jest.spyOn(repository, 'update');
    const updateWorkspace = createUpdateWorkspace(repository);

    const emptyId = await updateWorkspace({ id: '   ', name: 'Renamed' });
    expect(emptyId.status).toBe('invalid-input');

    const emptyName = await updateWorkspace({ id: VALID_ID, name: '   ' });
    expect(emptyName.status).toBe('invalid-input');

    const noFields = await updateWorkspace({ id: VALID_ID });
    expect(noFields.status).toBe('invalid-input');
    if (noFields.status === 'invalid-input') {
      expect(noFields.fieldErrors.form).toBe('Provide at least one field to update.');
    }

    expect(update).not.toHaveBeenCalled();
  });

  it('returns a notFound error for an unknown id', async () => {
    const repository = new FakeWorkspaceRepository();
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: 'missing', name: 'Renamed' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND_RESOURCE);
    }
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'update').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: VALID_ID, name: 'Renamed' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('keeps domain invariant violations as validation errors', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'update').mockRejectedValue({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      message: 'Board name cannot exceed 100 characters',
    });
    const updateWorkspace = createUpdateWorkspace(repository);

    const result = await updateWorkspace({ id: VALID_ID, name: 'Renamed' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'update').mockRejectedValue(new Error('socket hang up'));
    const updateWorkspace = createUpdateWorkspace(repository);

    const result: UpdateWorkspaceResult = await updateWorkspace({
      id: VALID_ID,
      name: 'Renamed',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
