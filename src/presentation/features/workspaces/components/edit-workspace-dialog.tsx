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
import type { Workspace } from '../../../../domain/workspace';
import { toAppError } from '../../../../shared/errors';
import { localizeFieldError, localizeMessage, useI18n } from '../../../i18n';
import { describeUpdateWorkspaceError } from '../workspace-error-messages';

export interface EditWorkspaceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspace: Workspace;
  readonly updateWorkspace: UpdateWorkspace;
  readonly onUpdated: (workspace: Workspace) => void;
}

export function EditWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  updateWorkspace,
  onUpdated,
}: EditWorkspaceDialogProps): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [fieldErrors, setFieldErrors] = useState<UpdateWorkspaceFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(workspace.name);
      setDescription(workspace.description ?? '');
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [open, workspace]);

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
      const result = await updateWorkspace({
        id: workspace.id.value,
        name,
        description: trimmedDescription === '' ? null : trimmedDescription,
      });

      switch (result.status) {
        case 'ok':
          onUpdated(result.workspace);
          onOpenChange(false);
          break;
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          if (result.fieldErrors.form !== undefined) {
            setFormError(localizeMessage(t, result.fieldErrors.form));
          }
          break;
        case 'error':
          setFormError(localizeMessage(t, describeUpdateWorkspaceError(result.error)));
          break;
      }
    } catch (error) {
      setFormError(localizeMessage(t, describeUpdateWorkspaceError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
