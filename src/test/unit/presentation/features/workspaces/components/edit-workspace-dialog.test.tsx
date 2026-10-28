import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UpdateWorkspace } from '../../../../../../application/commands';
import { createDeleteImage, createUploadImage } from '../../../../../../application/commands';
import type { ImageServices } from '../../../../../../application/image-services';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { EditWorkspaceDialog } from '../../../../../../presentation/features/workspaces/components/edit-workspace-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { createFakeImageStoragePort } from '../../../../../fixtures/fake-image-storage-port';

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-alpha'),
  name: 'Alpha',
  description: 'Current description',
  createdBy: UserId.create('user-1'),
});

interface RenderOptions {
  readonly open?: boolean;
  readonly workspace?: Workspace;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly onOpenChange?: jest.Mock;
  readonly onUpdated?: jest.Mock;
  readonly imageServices?: ImageServices;
}

function renderDialog({
  open = true,
  workspace = WORKSPACE,
  updateWorkspace = jest.fn().mockResolvedValue({ status: 'ok', workspace }),
  onOpenChange = jest.fn(),
  onUpdated = jest.fn(),
  imageServices,
}: RenderOptions = {}) {
  render(
    <EditWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      workspace={workspace}
      updateWorkspace={updateWorkspace}
      onUpdated={onUpdated}
      imageServices={imageServices}
    />,
  );

  return { updateWorkspace, onOpenChange, onUpdated };
}

describe('EditWorkspaceDialog', () => {
  it('uses the shared modal layout and keeps the footer outside the scroll body', () => {
    renderDialog();

    const body = screen.getByTestId('modal-body');
    const footer = screen.getByTestId('modal-footer');

    expect(screen.getByTestId('modal-layout')).toContainElement(body);
    expect(body).not.toContainElement(footer);
  });

  it('renders nothing while closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('prefills the current name and description and cancel leaves them untouched', async () => {
    const user = userEvent.setup();
    const { updateWorkspace, onOpenChange, onUpdated } = renderDialog();

    expect(screen.getByLabelText('Name')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Description')).toHaveValue('Current description');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('saves the name and description and notifies the caller', async () => {
    const user = userEvent.setup();
    const updated = Workspace.create({
      id: WORKSPACE.id,
      name: 'Renamed',
      description: 'Updated description',
      createdBy: UserId.create('user-1'),
    });
    const updateWorkspace: UpdateWorkspace = jest
      .fn()
      .mockResolvedValue({ status: 'ok', workspace: updated });
    const { onOpenChange, onUpdated } = renderDialog({ updateWorkspace });

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Renamed');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated description');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(updateWorkspace).toHaveBeenCalledWith({
      id: 'ws-alpha',
      name: 'Renamed',
      description: 'Updated description',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears the description when the field is emptied', async () => {
    const user = userEvent.setup();
    const updateWorkspace: UpdateWorkspace = jest
      .fn()
      .mockResolvedValue({ status: 'ok', workspace: WORKSPACE });
    renderDialog({ updateWorkspace });

    await user.clear(screen.getByLabelText('Description'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(updateWorkspace).toHaveBeenCalledWith({
        id: 'ws-alpha',
        name: 'Alpha',
        description: null,
      }),
    );
  });

  it('uploads and saves a new cover image, then removes the previous object', async () => {
    const user = userEvent.setup();
    const workspace = WORKSPACE.update({
      coverImageUrl: 'https://storage.test/old.png',
      coverImageStoragePath: 'workspaces/ws-alpha/images/old.png',
    });
    const updated = workspace.update({
      coverImageUrl: 'https://storage.test/new.png',
      coverImageStoragePath: 'workspaces/ws-alpha/images/new-new.png',
    });
    const imageStorage = createFakeImageStoragePort();
    const imageServices: ImageServices = {
      uploadImage: createUploadImage({
        storage: imageStorage,
        generateImageId: () => 'new',
      }),
      deleteImage: createDeleteImage({ storage: imageStorage }),
    };
    const updateWorkspace: UpdateWorkspace = jest
      .fn()
      .mockResolvedValue({ status: 'ok', workspace: updated });
    const { onUpdated, onOpenChange } = renderDialog({
      workspace,
      updateWorkspace,
      imageServices,
    });

    fireEvent.change(screen.getByTestId('workspace-cover-input'), {
      target: { files: [new File(['bytes'], 'new.png', { type: 'image/png' })] },
    });
    expect(await screen.findByAltText('Cover image preview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(updateWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        coverImageUrl: 'https://storage.test/workspaces/ws-alpha/images/new-new.png',
        coverImageStoragePath: 'workspaces/ws-alpha/images/new-new.png',
      }),
    );
    expect(imageStorage.deletes).toEqual([{ storagePath: 'workspaces/ws-alpha/images/old.png' }]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears the cover and deletes the previous object after saving', async () => {
    const user = userEvent.setup();
    const workspace = WORKSPACE.update({
      coverImageUrl: 'https://storage.test/old.png',
      coverImageStoragePath: 'workspaces/ws-alpha/images/old.png',
    });
    const cleared = workspace.update({ coverImageUrl: null, coverImageStoragePath: null });
    const imageStorage = createFakeImageStoragePort();
    const imageServices: ImageServices = {
      uploadImage: createUploadImage({ storage: imageStorage, generateImageId: () => 'unused' }),
      deleteImage: createDeleteImage({ storage: imageStorage }),
    };
    const updateWorkspace: UpdateWorkspace = jest
      .fn()
      .mockResolvedValue({ status: 'ok', workspace: cleared });
    renderDialog({ workspace, updateWorkspace, imageServices });

    await user.click(screen.getByRole('button', { name: 'Remove cover image' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(updateWorkspace).toHaveBeenCalledWith({
        id: 'ws-alpha',
        name: 'Alpha',
        description: 'Current description',
        coverImageUrl: null,
        coverImageStoragePath: null,
      }),
    );
    expect(imageStorage.deletes).toEqual([{ storagePath: 'workspaces/ws-alpha/images/old.png' }]);
  });

  it('keeps the dialog open and reports a failed cover upload', async () => {
    const user = userEvent.setup();
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
    const { updateWorkspace, onOpenChange } = renderDialog({ imageServices });

    fireEvent.change(screen.getByTestId('workspace-cover-input'), {
      target: { files: [new File(['bytes'], 'bad.pdf', { type: 'application/pdf' })] },
    });
    expect(await screen.findByText('Choose a PNG, JPEG, WebP or GIF image.')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('workspace-cover-input'), {
      target: { files: [new File(['bytes'], 'cover.png', { type: 'image/png' })] },
    });
    await screen.findByAltText('Cover image preview');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Choose a PNG, JPEG, WebP or GIF image.')).toBeInTheDocument();
    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('shows field errors without closing the dialog', async () => {
    const user = userEvent.setup();
    const updateWorkspace: UpdateWorkspace = jest.fn().mockResolvedValue({
      status: 'invalid-input',
      fieldErrors: { name: 'Enter a board name.' },
    });
    const { onOpenChange, onUpdated } = renderDialog({ updateWorkspace });

    await user.clear(screen.getByLabelText('Name'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a board name.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('shows a friendly error and stays open when the update fails', async () => {
    const user = userEvent.setup();
    const updateWorkspace: UpdateWorkspace = jest.fn().mockResolvedValue({
      status: 'error',
      error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'boom'),
    });
    const { onOpenChange, onUpdated } = renderDialog({ updateWorkspace });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The service is temporarily unavailable. Please try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
