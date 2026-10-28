import {
  Button,
  Dialog,
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
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalForm,
  ModalHeader,
  ModalLayout,
} from '../../components/modal-layout';
import { shortUserId } from '../../collaboration';
import { useI18n } from '../../i18n';
import { TASK_STATUS_LABEL_KEYS } from '../renderers/task-status-meta';

export interface TaskFormValues {
  readonly title: string;
  readonly status: TaskStatus;
  readonly notes: string;
  readonly assigneeId: string;
  readonly dueDate: string;
}

export interface TaskAssigneeOption {
  readonly userId: string;
  readonly label: string;
}

export type TaskFormMode = 'create' | 'edit';

export interface TaskFormDialogProps {
  readonly open: boolean;
  readonly mode: TaskFormMode;
  readonly initialValues?: TaskFormValues;
  readonly assignees?: readonly TaskAssigneeOption[];
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (values: TaskFormValues) => void;
}

const CREATE_DEFAULTS: TaskFormValues = {
  title: '',
  status: 'todo',
  notes: '',
  assigneeId: '',
  dueDate: '',
};

const MODAL_SELECT_Z_INDEX = 'calc(var(--rr-z-modal) + 1)';

export function TaskFormDialog({
  open,
  mode,
  initialValues,
  assignees = [],
  onOpenChange,
  onSubmit,
}: TaskFormDialogProps): ReactNode {
  const { t } = useI18n();
  const [title, setTitle] = useState(CREATE_DEFAULTS.title);
  const [status, setStatus] = useState<TaskStatus>(CREATE_DEFAULTS.status);
  const [notes, setNotes] = useState(CREATE_DEFAULTS.notes);
  const [assigneeId, setAssigneeId] = useState(CREATE_DEFAULTS.assigneeId);
  const [dueDate, setDueDate] = useState(CREATE_DEFAULTS.dueDate);
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
    setAssigneeId(defaults.assigneeId);
    setDueDate(defaults.dueDate);
    setTitleError(null);
  }, [open, mode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle === '') {
      setTitleError(t('taskForm.titleRequired'));
      return;
    }

    setTitleError(null);
    onSubmit({
      title: trimmedTitle,
      status,
      notes: notes.trim(),
      assigneeId,
      dueDate,
    });
  }

  const assigneeOptions =
    assigneeId !== '' && !assignees.some((assignee) => assignee.userId === assigneeId)
      ? [...assignees, { userId: assigneeId, label: shortUserId(assigneeId) }]
      : assignees;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent data-testid="task-form-dialog">
        <ModalForm onSubmit={handleSubmit} noValidate>
          <ModalLayout>
            <ModalHeader>
              <DialogHeader>
                <DialogTitle>
                  {mode === 'create' ? t('taskForm.create.title') : t('taskForm.edit.title')}
                </DialogTitle>
                {mode === 'create' && (
                  <DialogDescription>{t('taskForm.create.description')}</DialogDescription>
                )}
              </DialogHeader>
            </ModalHeader>
            <ModalBody>
              <Stack gap="space-4">
                <FormField>
                  <FormFieldLabel>{t('taskForm.title')}</FormFieldLabel>
                  <FormFieldControl>
                    {(field) => (
                      <Input
                        {...field}
                        name="title"
                        autoComplete="off"
                        value={title}
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
                  <FormFieldLabel>{t('taskForm.status')}</FormFieldLabel>
                  <FormFieldControl>
                    {(field) => (
                      <Select
                        value={status}
                        onValueChange={(value) => setStatus(value as TaskStatus)}
                      >
                        <Select.Trigger {...field} aria-label={t('taskForm.status')}>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content
                          placement="bottom-start"
                          style={{ zIndex: MODAL_SELECT_Z_INDEX }}
                        >
                          {TASK_STATUSES.map((option) => (
                            <Select.Item key={option} value={option}>
                              {t(TASK_STATUS_LABEL_KEYS[option])}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    )}
                  </FormFieldControl>
                </FormField>
                <FormField>
                  <FormFieldLabel>{t('taskForm.assignee')}</FormFieldLabel>
                  <FormFieldControl>
                    {(field) => (
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <Select.Trigger {...field} aria-label={t('taskForm.assignee')}>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content
                          placement="bottom-start"
                          style={{ zIndex: MODAL_SELECT_Z_INDEX }}
                        >
                          <Select.Item value="">{t('taskForm.unassigned')}</Select.Item>
                          {assigneeOptions.map((assignee) => (
                            <Select.Item key={assignee.userId} value={assignee.userId}>
                              {assignee.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    )}
                  </FormFieldControl>
                </FormField>
                <FormField>
                  <FormFieldLabel>{t('taskForm.dueDate')}</FormFieldLabel>
                  <FormFieldControl>
                    {(field) => (
                      <Input
                        {...field}
                        type="date"
                        name="dueDate"
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                      />
                    )}
                  </FormFieldControl>
                </FormField>
                <FormField>
                  <FormFieldLabel>{t('taskForm.notes')}</FormFieldLabel>
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
              </Stack>
            </ModalBody>
            <ModalFooter>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {mode === 'create' ? t('taskForm.createAction') : t('taskForm.saveAction')}
                </Button>
              </DialogFooter>
            </ModalFooter>
          </ModalLayout>
        </ModalForm>
      </ModalContent>
    </Dialog>
  );
}
