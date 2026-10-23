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
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
} from '@raulrod/ui';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import type {
  CreateWorkspace,
  CreateWorkspaceFieldErrors,
  UpdateWorkspace,
} from '../../../../application/commands';
import type { ImageServices } from '../../../../application/image-services';
import type { WorkspaceTemplateId } from '../../../../application/services/workspace-templates';
import { validateImageFileCandidate } from '../../../../application/services/image-upload';
import type { UserId } from '../../../../domain/shared';
import { WorkspaceId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { readFileAsDataUrl, readFileBytes } from '../workspace-cover-file';
import { describeCreateWorkspaceError } from '../workspace-error-messages';
import { localizeFieldError, localizeMessage, useI18n, type TranslationKey } from '../../../i18n';
import { WorkspaceCoverField } from './workspace-cover-field';

type TemplateSelection = 'blank' | WorkspaceTemplateId;

interface TemplateOption {
  readonly id: TemplateSelection;
  readonly nameKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}

const TEMPLATE_OPTIONS: readonly TemplateOption[] = [
  {
    id: 'blank',
    nameKey: 'workspaces.createDialog.templateBlank',
    descriptionKey: 'workspaces.createDialog.templateBlankDescription',
  },
  {
    id: 'retrospective',
    nameKey: 'workspaces.createDialog.templateRetrospective',
    descriptionKey: 'workspaces.createDialog.templateRetrospectiveDescription',
  },
  {
    id: 'project-kickoff',
    nameKey: 'workspaces.createDialog.templateKickoff',
    descriptionKey: 'workspaces.createDialog.templateKickoffDescription',
  },
  {
    id: 'brainstorming',
    nameKey: 'workspaces.createDialog.templateBrainstorming',
    descriptionKey: 'workspaces.createDialog.templateBrainstormingDescription',
  },
];

function isTemplateSelection(value: string): value is TemplateSelection {
  return TEMPLATE_OPTIONS.some((option) => option.id === value);
}

export interface CreateWorkspaceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly createWorkspace: CreateWorkspace;
  readonly createdBy: UserId;
  readonly onCreated: () => void;
  readonly imageServices?: ImageServices;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly surface?: 'brand' | 'stitch';
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  createWorkspace,
  createdBy,
  onCreated,
  imageServices,
  updateWorkspace,
  surface = 'brand',
}: CreateWorkspaceDialogProps): ReactNode {
  const { t } = useI18n();
  const templateLabelId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<TemplateSelection>('blank');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverWarning, setCoverWarning] = useState<string | null>(null);
  const [createdWithoutCover, setCreatedWithoutCover] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CreateWorkspaceFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedTemplate =
    TEMPLATE_OPTIONS.find((option) => option.id === template) ?? TEMPLATE_OPTIONS[0];
  const canSelectCover = imageServices !== undefined && updateWorkspace !== undefined;

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTemplate('blank');
      setCoverFile(null);
      setCoverPreviewUrl(null);
      setCoverError(null);
      setCoverWarning(null);
      setCreatedWithoutCover(false);
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [open]);

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
    setCoverWarning(null);
    setCoverFile(file);
    setCoverPreviewUrl(previewUrl);
  }

  function handleCoverRemove(): void {
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setCoverError(null);
    setCoverWarning(null);
  }

  function finishCreatedWithoutCover(): void {
    setCreatedWithoutCover(true);
    setCoverWarning(t('workspaces.cover.createFailed'));
    onCreated();
  }

  async function uploadCover(workspaceId: string): Promise<boolean> {
    if (coverFile === null || imageServices === undefined || updateWorkspace === undefined) {
      return true;
    }

    const bytes = await readFileBytes(coverFile);
    if (bytes === null) {
      setCoverError(t('workspaces.cover.uploadFailed'));
      finishCreatedWithoutCover();
      return false;
    }

    const uploaded = await imageServices.uploadImage({
      workspaceId: WorkspaceId.create(workspaceId),
      file: {
        name: coverFile.name,
        contentType: coverFile.type,
        size: coverFile.size,
        data: bytes,
      },
    });

    if (uploaded.status === 'error') {
      setCoverError(localizeMessage(t, uploaded.error.message));
      finishCreatedWithoutCover();
      return false;
    }

    const updated = await updateWorkspace({
      id: workspaceId,
      coverImageUrl: uploaded.image.url,
      coverImageStoragePath: uploaded.image.storagePath,
    });

    if (updated.status !== 'ok') {
      await imageServices.deleteImage({ storagePath: uploaded.image.storagePath });
      setCoverError(t('workspaces.cover.createFailed'));
      finishCreatedWithoutCover();
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || createdWithoutCover) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setCoverWarning(null);

    try {
      const trimmedDescription = description.trim();
      const result = await createWorkspace({
        name,
        createdBy,
        description: trimmedDescription === '' ? undefined : trimmedDescription,
        ...(template === 'blank' ? {} : { templateId: template }),
      });
      switch (result.status) {
        case 'ok': {
          const coverUploaded = await uploadCover(result.workspace.id.value);
          if (!coverUploaded) {
            break;
          }
          onCreated();
          onOpenChange(false);
          break;
        }
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          break;
        case 'error':
          setFormError(localizeMessage(t, describeCreateWorkspaceError(result.error)));
          break;
      }
    } catch (error) {
      setFormError(localizeMessage(t, describeCreateWorkspaceError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...(surface === 'stitch' ? { 'data-surface': 'stitch' } : {})}>
        <DialogHeader>
          <DialogTitle>{t('workspaces.createDialog.title')}</DialogTitle>
          <DialogDescription>{t('workspaces.createDialog.description')}</DialogDescription>
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
            {canSelectCover && (
              <WorkspaceCoverField
                previewUrl={coverPreviewUrl}
                fileName={coverFile?.name ?? null}
                disabled={submitting || createdWithoutCover}
                uploading={submitting && coverFile !== null}
                error={coverError}
                onSelect={(file) => {
                  void handleCoverSelect(file);
                }}
                onRemove={coverPreviewUrl === null ? undefined : handleCoverRemove}
              />
            )}
            <FormField>
              <FormFieldLabel id={templateLabelId}>
                {t('workspaces.createDialog.template')}
              </FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <RadioGroup
                    {...field}
                    aria-labelledby={templateLabelId}
                    value={template}
                    onValueChange={(value) => {
                      if (isTemplateSelection(value)) {
                        setTemplate(value);
                      }
                    }}
                  >
                    {TEMPLATE_OPTIONS.map((option) => (
                      <Radio key={option.id} value={option.id}>
                        {t(option.nameKey)}
                      </Radio>
                    ))}
                  </RadioGroup>
                )}
              </FormFieldControl>
              <FormFieldDescription>{t(selectedTemplate.descriptionKey)}</FormFieldDescription>
            </FormField>
            {coverWarning !== null && (
              <Text role="alert" color="color.text.warning">
                {coverWarning}
              </Text>
            )}
            {formError !== null && (
              <Text role="alert" color="color.text.danger">
                {formError}
              </Text>
            )}
            <DialogFooter>
              {createdWithoutCover ? (
                <Button type="button" onClick={() => onOpenChange(false)}>
                  {t('common.close')}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => onOpenChange(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" loading={submitting}>
                    {t('workspaces.createDialog.submit')}
                  </Button>
                </>
              )}
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
