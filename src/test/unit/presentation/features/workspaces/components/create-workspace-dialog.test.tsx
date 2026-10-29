import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createCreateWorkspace,
  createDeleteImage,
  createUpdateWorkspace,
  createUploadImage,
  type CreateWorkspace,
  type CreateWorkspaceResult,
  type UpdateWorkspace,
} from '../../../../../../application/commands';
import type { ImageServices } from '../../../../../../application/image-services';
import { CreateWorkspaceDialog } from '../../../../../../presentation/features/workspaces/components/create-workspace-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { UserId } from '../../../../../../domain/shared';
import { FakeWorkspaceRepository } from '../../../../../fixtures/fake-workspace-repository';
import { createFakeImageStoragePort } from '../../../../../fixtures/fake-image-storage-port';

const CREATED_BY = UserId.create('user-1');

interface HarnessProps {
  readonly createWorkspace: CreateWorkspace;
  readonly open: boolean;
  readonly onOpenChange: jest.Mock;
  readonly onCreated: jest.Mock;
  readonly createdBy: UserId;
  readonly imageServices?: ImageServices;
  readonly updateWorkspace?: UpdateWorkspace;
}

interface RenderDialogOptions {
  readonly imageServices?: ImageServices;
  readonly updateWorkspace?: UpdateWorkspace;
}

function renderDialog(createWorkspace: CreateWorkspace, options: RenderDialogOptions = {}) {
  const onOpenChange = jest.fn();
  const onCreated = jest.fn();
  const props: HarnessProps = {
    createWorkspace,
    open: true,
    onOpenChange,
    onCreated,
    createdBy: CREATED_BY,
    ...options,
  };

  const { rerender } = render(<CreateWorkspaceDialog {...props} />);

  return { onOpenChange, onCreated, rerender, props };
}

function fillName(name: string): void {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
}

describe('CreateWorkspaceDialog', () => {
  it('uses the shared modal layout and keeps the footer outside the scroll body', () => {
    renderDialog(jest.fn());

    const body = screen.getByTestId('modal-body');
    const footer = screen.getByTestId('modal-footer');

    expect(screen.getByTestId('modal-layout')).toContainElement(body);
    expect(body).not.toContainElement(footer);
  });

  it('renders labelled fields while open and nothing while closed', () => {
    const createWorkspace = jest.fn();
    const onOpenChange = jest.fn();
    const onCreated = jest.fn();

    const { rerender } = render(
      <CreateWorkspaceDialog
        open={false}
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        createdBy={CREATED_BY}
        onCreated={onCreated}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        createdBy={CREATED_BY}
        onCreated={onCreated}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Create board' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Start from' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Blank' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Retrospective' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Project kickoff' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brainstorming' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Board type' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'General' })).toBeChecked();
  });

  it('shows a field error for an empty name and keeps the dialog open', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    submit();

    expect(await screen.findByText('Enter a board name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    await expect(repository.list()).resolves.toHaveLength(0);
  });

  it('creates the workspace with trimmed input, notifies and closes', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    fillName('  Roadmap Q4  ');
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: '  Shared plan  ' },
    });
    submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createWorkspace).toHaveBeenCalledWith({
      name: '  Roadmap Q4  ',
      description: 'Shared plan',
      createdBy: CREATED_BY,
      type: 'general',
    });
    const stored = await repository.list();
    expect(stored.map((workspace) => workspace.name)).toEqual(['Roadmap Q4']);
    expect(stored[0]?.type).toBe('general');
  });

  it('creates the workspace with the selected type', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onCreated } = renderDialog(createWorkspace);

    const user = userEvent.setup();
    fillName('Trip');
    expect(screen.getByRole('radio', { name: 'General' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Travel' }));
    expect(screen.getByRole('radio', { name: 'Travel' })).toBeChecked();
    submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const [stored] = await repository.list();
    expect(stored?.type).toBe('travel');
  });

  it('submits the selected template instead of a blank board', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onCreated } = renderDialog(createWorkspace);

    fillName('Sprint retro');
    fireEvent.click(screen.getByRole('radio', { name: 'Retrospective' }));
    submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(createWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sprint retro',
        createdBy: CREATED_BY,
        templateId: 'retrospective',
      }),
    );
  });

  it('creates the board and attaches the selected cover image', async () => {
    const repository = new FakeWorkspaceRepository();
    const imageStorage = createFakeImageStoragePort();
    const imageServices: ImageServices = {
      uploadImage: createUploadImage({
        storage: imageStorage,
        generateImageId: () => 'cover-1',
      }),
      deleteImage: createDeleteImage({ storage: imageStorage }),
    };
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onCreated, onOpenChange } = renderDialog(createWorkspace, {
      imageServices,
      updateWorkspace: createUpdateWorkspace(repository),
    });

    fillName('Covered board');
    const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('workspace-cover-input'), {
      target: { files: [file] },
    });

    expect(await screen.findByAltText('Cover image preview')).toBeInTheDocument();
    submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(imageStorage.uploads).toHaveLength(1);
    const [workspace] = await repository.list();
    expect(workspace.coverImageUrl).toBe(
      `https://storage.test/${imageStorage.uploads[0].storagePath}`,
    );
    expect(workspace.coverImageStoragePath).toBe(imageStorage.uploads[0].storagePath);
  });

  it('keeps the board created without a cover when the upload fails', async () => {
    const repository = new FakeWorkspaceRepository();
    const imageServices: ImageServices = {
      uploadImage: jest.fn().mockResolvedValue({
        status: 'error',
        error: createAppError(
          'validation',
          ERROR_CODES.IMAGE_INVALID_TYPE,
          'Choose a PNG, JPEG, WebP or GIF image.',
        ),
      }),
      deleteImage: jest.fn(),
    };
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onCreated, onOpenChange } = renderDialog(createWorkspace, {
      imageServices,
      updateWorkspace: createUpdateWorkspace(repository),
    });

    fillName('Covered board');
    const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('workspace-cover-input'), {
      target: { files: [file] },
    });
    await screen.findByAltText('Cover image preview');
    submit();

    expect(await screen.findByText(/Board created without a cover image/)).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    const [workspace] = await repository.list();
    expect(workspace.coverImageUrl).toBeNull();
  });

  it('shows a friendly message when creation fails and stays open', async () => {
    const createWorkspace = jest.fn(async (): Promise<CreateWorkspaceResult> => ({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    fillName('Roadmap Q4');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a message when the use case rejects unexpectedly', async () => {
    const createWorkspace = jest.fn(async (): Promise<CreateWorkspaceResult> => {
      throw new Error('boom');
    });
    const { onCreated } = renderDialog(createWorkspace);

    fillName('Roadmap Q4');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('closes without creating when cancelled', () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    fillName('Roadmap Q4');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createWorkspace).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog when it opens', () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    renderDialog(createWorkspace);

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange } = renderDialog(createWorkspace);
    const user = userEvent.setup();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets the fields when reopened', () => {
    const createWorkspace = jest.fn();
    const onOpenChange = jest.fn();
    const onCreated = jest.fn();

    const { rerender } = render(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        createdBy={CREATED_BY}
        onCreated={onCreated}
      />,
    );
    fillName('Draft');

    rerender(
      <CreateWorkspaceDialog
        open={false}
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        createdBy={CREATED_BY}
        onCreated={onCreated}
      />,
    );
    rerender(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        createdBy={CREATED_BY}
        onCreated={onCreated}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'Blank' })).toBeChecked();
  });
});
