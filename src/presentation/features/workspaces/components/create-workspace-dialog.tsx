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
import type { CreateWorkspace, CreateWorkspaceFieldErrors } from '../../../../application/commands';
import { toAppError } from '../../../../shared/errors';
import { describeCreateWorkspaceError } from '../workspace-error-messages';

export interface CreateWorkspaceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly createWorkspace: CreateWorkspace;
  readonly onCreated: () => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  createWorkspace,
  onCreated,
}: CreateWorkspaceDialogProps): ReactNode {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CreateWorkspaceFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
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
        description: trimmedDescription === '' ? undefined : trimmedDescription,
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
          setFormError(describeCreateWorkspaceError(result.error));
          break;
      }
    } catch (error) {
      setFormError(describeCreateWorkspaceError(toAppError(error)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>Give your shared plan a home.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="space-4">
            <FormField>
              <FormFieldLabel>Name</FormFieldLabel>
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
                <FormFieldError>{fieldErrors.name}</FormFieldError>
              )}
            </FormField>
            <FormField>
              <FormFieldLabel>Description</FormFieldLabel>
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
                variant="secondary"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create
              </Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
