import {
  createCreateWorkspace,
  validateCreateWorkspaceInput,
  type CreateWorkspaceResult,
} from '../../../../application/commands';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const VALID_INPUT = { name: 'Product roadmap' };

describe('validateCreateWorkspaceInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateCreateWorkspaceInput(VALID_INPUT)).toEqual({});
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateCreateWorkspaceInput({ name: '' }).name).toBe('Enter a workspace name.');
    expect(validateCreateWorkspaceInput({ name: '   ' }).name).toBe('Enter a workspace name.');
  });

  it('rejects names above the maximum length', () => {
    const errors = validateCreateWorkspaceInput({ name: 'x'.repeat(101) });
    expect(errors.name).toBe('Workspace name must be at most 100 characters.');
  });

  it('accepts names at the exact maximum length', () => {
    expect(validateCreateWorkspaceInput({ name: 'x'.repeat(100) })).toEqual({});
  });
});

describe('createCreateWorkspace', () => {
  it('creates a workspace with the trimmed name and a generated id', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = createCreateWorkspace(repository);

    const result = await createWorkspace({ name: '  Product roadmap  ' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.name).toBe('Product roadmap');
      expect(result.workspace.id.value).not.toBe('');
      expect(result.workspace.description).toBeNull();
    }
  });

  it('passes the description through, including an explicit null', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = createCreateWorkspace(repository);

    const withDescription = await createWorkspace({
      name: 'With description',
      description: 'Shared plan',
    });
    expect(withDescription.status).toBe('ok');
    if (withDescription.status === 'ok') {
      expect(withDescription.workspace.description).toBe('Shared plan');
    }

    const withNull = await createWorkspace({ name: 'No description', description: null });
    expect(withNull.status).toBe('ok');
    if (withNull.status === 'ok') {
      expect(withNull.workspace.description).toBeNull();
    }
  });

  it('does not call the repository when input is invalid', async () => {
    const repository = new FakeWorkspaceRepository();
    const create = jest.spyOn(repository, 'create');
    const createWorkspace = createCreateWorkspace(repository);

    const result = await createWorkspace({ name: '   ' });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.name).toBe('Enter a workspace name.');
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'create').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const createWorkspace = createCreateWorkspace(repository);

    const result = await createWorkspace(VALID_INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('keeps domain invariant violations as validation errors', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'create').mockRejectedValue({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      message: 'Workspace name cannot exceed 100 characters',
    });
    const createWorkspace = createCreateWorkspace(repository);

    const result = await createWorkspace(VALID_INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'create').mockRejectedValue(new Error('socket hang up'));
    const createWorkspace = createCreateWorkspace(repository);

    const result: CreateWorkspaceResult = await createWorkspace(VALID_INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
