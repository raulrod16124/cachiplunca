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
  Select,
  Stack,
  Textarea,
} from '@raulrod/ui';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { TASK_STATUSES } from '../../../domain/element';
import type { TaskStatus } from '../../../domain/element';
import { TASK_STATUS_META } from '../renderers/task-status-meta';

export interface TaskFormValues {
  readonly title: string;
  readonly status: TaskStatus;
  readonly notes: string;
}

export type TaskFormMode = 'create' | 'edit';

export interface TaskFormDialogProps {
  readonly open: boolean;
  readonly mode: TaskFormMode;
  readonly initialValues?: TaskFormValues;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (values: TaskFormValues) => void;
}

const CREATE_DEFAULTS: TaskFormValues = { title: '', status: 'todo', notes: '' };

const EMPTY_TITLE_ERROR = 'Title is required';

const MODAL_SELECT_Z_INDEX = 'calc(var(--rr-z-modal) + 1)';

export function TaskFormDialog({
  open,
  mode,
  initialValues,
  onOpenChange,
  onSubmit,
}: TaskFormDialogProps): ReactNode {
  const [title, setTitle] = useState(CREATE_DEFAULTS.title);
  const [status, setStatus] = useState<TaskStatus>(CREATE_DEFAULTS.status);
  const [notes, setNotes] = useState(CREATE_DEFAULTS.notes);
  const [titleError, setTitleError] = useState<string | null>(null);
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaults =
      mode === 'edit' ? (initialValuesRef.current ?? CREATE_DEFAULTS) : CREATE_DEFAULTS;
    setTitle(defaults.title);
    setStatus(defaults.status);
    setNotes(defaults.notes);
    setTitleError(null);
  }, [open, mode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle === '') {
      setTitleError(EMPTY_TITLE_ERROR);
      return;
    }

    setTitleError(null);
    onSubmit({ title: trimmedTitle, status, notes: notes.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="task-form-dialog">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New task' : 'Edit task'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Set a title, choose a status and add notes.'
              : 'Update the title, status or notes of this task.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="space-4">
            <FormField>
              <FormFieldLabel>Title</FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <Input
                    {...field}
                    name="title"
                    autoComplete="off"
                    value={title}
                    aria-invalid={titleError === null ? undefined : true}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (titleError !== null) {
                        setTitleError(null);
                      }
                    }}
                  />
                )}
              </FormFieldControl>
              {titleError !== null && <FormFieldError>{titleError}</FormFieldError>}
            </FormField>
            <FormField>
              <FormFieldLabel>Status</FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                    <Select.Trigger {...field} aria-label="Status">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content
                      placement="bottom-start"
                      style={{ zIndex: MODAL_SELECT_Z_INDEX }}
                    >
                      {TASK_STATUSES.map((option) => (
                        <Select.Item key={option} value={option}>
                          {TASK_STATUS_META[option].label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              </FormFieldControl>
            </FormField>
            <FormField>
              <FormFieldLabel>Notes</FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <Textarea
                    {...field}
                    name="notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                )}
              </FormFieldControl>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{mode === 'create' ? 'Create task' : 'Save changes'}</Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
