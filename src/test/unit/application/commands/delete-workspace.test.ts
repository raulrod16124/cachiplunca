import {
  createDeleteWorkspace,
  validateDeleteWorkspaceInput,
  type DeleteWorkspaceResult,
} from '../../../../application/commands';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

describe('validateDeleteWorkspaceInput', () => {
  it('returns no errors for a valid id', () => {
    expect(validateDeleteWorkspaceInput({ id: 'ws-1' })).toEqual({});
  });

  it('rejects an empty id', () => {
    expect(validateDeleteWorkspaceInput({ id: '' }).id).toBe('Enter a workspace id.');
  });

  it('rejects a whitespace-only id', () => {
    expect(validateDeleteWorkspaceInput({ id: '   ' }).id).toBe('Enter a workspace id.');
  });
});

describe('createDeleteWorkspace', () => {
  it('deletes an existing workspace so it is no longer exposed', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ name: 'Disposable' });
    const deleteWorkspace = createDeleteWorkspace(repository);

    const result = await deleteWorkspace({ id: created.id.value });

    expect(result.status).toBe('ok');
    expect(await repository.list()).toEqual([]);
    expect(await repository.findById(created.id)).toBeNull();
  });

  it('accepts an id with surrounding whitespace', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ name: 'Disposable' });
    const deleteWorkspace = createDeleteWorkspace(repository);

    const result = await deleteWorkspace({ id: `  ${created.id.value}  ` });

    expect(result.status).toBe('ok');
    expect(await repository.list()).toEqual([]);
  });

  it('does not call the repository when input is invalid', async () => {
    const repository = new FakeWorkspaceRepository();
    const remove = jest.spyOn(repository, 'delete');
    const deleteWorkspace = createDeleteWorkspace(repository);

    const emptyId = await deleteWorkspace({ id: '' });
    expect(emptyId.status).toBe('invalid-input');
    if (emptyId.status === 'invalid-input') {
      expect(emptyId.fieldErrors.id).toBe('Enter a workspace id.');
    }

    const whitespaceId = await deleteWorkspace({ id: '   ' });
    expect(whitespaceId.status).toBe('invalid-input');

    expect(remove).not.toHaveBeenCalled();
  });

  it('returns a notFound error for an unknown id', async () => {
    const repository = new FakeWorkspaceRepository();
    const deleteWorkspace = createDeleteWorkspace(repository);

    const result = await deleteWorkspace({ id: 'missing' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND_RESOURCE);
    }
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'delete').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const deleteWorkspace = createDeleteWorkspace(repository);

    const result = await deleteWorkspace({ id: 'ws-1' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('socket hang up'));
    const deleteWorkspace = createDeleteWorkspace(repository);

    const result: DeleteWorkspaceResult = await deleteWorkspace({ id: 'ws-1' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
