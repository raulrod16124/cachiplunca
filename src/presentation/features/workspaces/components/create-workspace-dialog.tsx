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
import type { CreateWorkspace, CreateWorkspaceFieldErrors } from '../../../../application/commands';
import type { WorkspaceTemplateId } from '../../../../application/services/workspace-templates';
import type { UserId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { describeCreateWorkspaceError } from '../workspace-error-messages';
import { localizeFieldError, localizeMessage, useI18n, type TranslationKey } from '../../../i18n';

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
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  createWorkspace,
  createdBy,
  onCreated,
}: CreateWorkspaceDialogProps): ReactNode {
  const { t } = useI18n();
  const templateLabelId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<TemplateSelection>('blank');
  const [fieldErrors, setFieldErrors] = useState<CreateWorkspaceFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedTemplate =
    TEMPLATE_OPTIONS.find((option) => option.id === template) ?? TEMPLATE_OPTIONS[0];

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTemplate('blank');
      setFieldErrors({});
      setFormError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const trimmedDescription = description.trim();
      const result = await createWorkspace({
        name,
        createdBy,
        description: trimmedDescription === '' ? undefined : trimmedDescription,
        ...(template === 'blank' ? {} : { templateId: template }),
      });
      switch (result.status) {
        case 'ok':
          onCreated();
          onOpenChange(false);
          break;
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
      <DialogContent>
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
                {t('workspaces.createDialog.submit')}
              </Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
