import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  FormFieldControl,
  FormFieldError,
  FormFieldLabel,
  Input,
  Stack,
  Text,
  Textarea,
} from '@raulrod/ui';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { UpdateWorkspace, UpdateWorkspaceFieldErrors } from '../../../../application/commands';
import type { ImageServices } from '../../../../application/image-services';
import { validateImageFileCandidate } from '../../../../application/services/image-upload';
import type { Workspace } from '../../../../domain/workspace';
import { WorkspaceId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { readFileAsDataUrl, readFileBytes } from '../workspace-cover-file';
import { localizeFieldError, localizeMessage, useI18n } from '../../../i18n';
import { describeUpdateWorkspaceError } from '../workspace-error-messages';
import { WorkspaceCoverField } from './workspace-cover-field';

export interface EditWorkspaceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspace: Workspace;
  readonly updateWorkspace: UpdateWorkspace;
  readonly onUpdated: (workspace: Workspace) => void;
  readonly imageServices?: ImageServices;
  readonly surface?: 'brand' | 'stitch';
}

export function EditWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  updateWorkspace,
  onUpdated,
  imageServices,
  surface = 'brand',
}: EditWorkspaceDialogProps): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UpdateWorkspaceFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentCoverUrl = removeCover ? null : workspace.coverImageUrl;
  const coverPreview = coverPreviewUrl ?? currentCoverUrl;

  useEffect(() => {
    if (open) {
      setName(workspace.name);
      setDescription(workspace.description ?? '');
      setCoverFile(null);
      setCoverPreviewUrl(null);
      setRemoveCover(false);
      setCoverError(null);
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [open, workspace]);

  async function handleCoverSelect(file: File): Promise<void> {
    const validationError = validateImageFileCandidate({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (validationError !== null) {
      setCoverError(validationError.message);
      return;
    }

    const previewUrl = await readFileAsDataUrl(file);
    setCoverError(null);
    setCoverFile(file);
    setCoverPreviewUrl(previewUrl);
    setRemoveCover(false);
  }

  function handleCoverRemove(): void {
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setRemoveCover(workspace.coverImageUrl !== null);
    setCoverError(null);
  }

  async function deleteImageBestEffort(storagePath: string): Promise<void> {
    if (imageServices === undefined) {
      return;
    }

    try {
      await imageServices.deleteImage({ storagePath });
    } catch {
      // Best-effort cleanup: a failed delete must not block the update.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setCoverError(null);

    let uploadedStoragePath: string | null = null;

    try {
      const trimmedDescription = description.trim();
      let coverFields: {
        coverImageUrl?: string | null;
        coverImageStoragePath?: string | null;
      } = {};

      if (coverFile !== null && imageServices !== undefined) {
        const bytes = await readFileBytes(coverFile);
        if (bytes === null) {
          setCoverError(t('workspaces.cover.uploadFailed'));
          return;
        }

        const uploaded = await imageServices.uploadImage({
          workspaceId: WorkspaceId.create(workspace.id.value),
          file: {
            name: coverFile.name,
            contentType: coverFile.type,
            size: coverFile.size,
            data: bytes,
          },
        });

        if (uploaded.status === 'error') {
          setCoverError(uploaded.error.message);
          return;
        }

        uploadedStoragePath = uploaded.image.storagePath;
        coverFields = {
          coverImageUrl: uploaded.image.url,
          coverImageStoragePath: uploaded.image.storagePath,
        };
      } else if (removeCover) {
        coverFields = {
          coverImageUrl: null,
          coverImageStoragePath: null,
        };
      }

      const result = await updateWorkspace({
        id: workspace.id.value,
        name,
        description: trimmedDescription === '' ? null : trimmedDescription,
        ...coverFields,
      });

      switch (result.status) {
        case 'ok': {
          const previousStoragePath = workspace.coverImageStoragePath;
          if (previousStoragePath !== null && (coverFile !== null || removeCover)) {
            await deleteImageBestEffort(previousStoragePath);
          }
          onUpdated(result.workspace);
          onOpenChange(false);
          break;
        }
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          if (result.fieldErrors.form !== undefined) {
            setFormError(localizeMessage(t, result.fieldErrors.form));
          }
          if (result.fieldErrors.cover !== undefined) {
            setCoverError(localizeFieldError(t, result.fieldErrors.cover));
          }
          if (uploadedStoragePath !== null) {
            await deleteImageBestEffort(uploadedStoragePath);
          }
          break;
        case 'error':
          if (uploadedStoragePath !== null) {
            await deleteImageBestEffort(uploadedStoragePath);
          }
          setFormError(localizeMessage(t, describeUpdateWorkspaceError(result.error)));
          break;
      }
    } catch (error) {
      if (uploadedStoragePath !== null) {
        await deleteImageBestEffort(uploadedStoragePath);
      }
      setFormError(localizeMessage(t, describeUpdateWorkspaceError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...(surface === 'stitch' ? { 'data-surface': 'stitch' } : {})}>
        <DialogHeader>
          <DialogTitle>{t('workspaces.editDialog.title')}</DialogTitle>
          <DialogDescription>{t('workspaces.editDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="space-4">
            <FormField>
              <FormFieldLabel>{t('workspaces.createDialog.name')}</FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <Input
                    {...field}
                    name="name"
                    autoComplete="off"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                )}
              </FormFieldControl>
              {fieldErrors.name !== undefined && (
                <FormFieldError>{localizeFieldError(t, fieldErrors.name)}</FormFieldError>
              )}
            </FormField>
            <FormField>
              <FormFieldLabel>{t('workspaces.createDialog.descriptionLabel')}</FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <Textarea
                    {...field}
                    name="description"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                )}
              </FormFieldControl>
            </FormField>
            {imageServices !== undefined && (
              <WorkspaceCoverField
                previewUrl={coverPreview}
                fileName={coverFile?.name ?? null}
                disabled={submitting}
                uploading={submitting && coverFile !== null}
                error={coverError}
                onSelect={(file) => {
                  void handleCoverSelect(file);
                }}
                onRemove={coverPreview === null ? undefined : handleCoverRemove}
              />
            )}
            {formError !== null && (
              <Text role="alert" color="color.text.danger">
                {formError}
              </Text>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={submitting}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
