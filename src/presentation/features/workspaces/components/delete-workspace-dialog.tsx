import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Stack,
  Text,
} from '@raulrod/ui';
import { useEffect, useState, type ReactNode } from 'react';
import type { DeleteWorkspace } from '../../../../application/commands';
import type { Workspace } from '../../../../domain/workspace';
import { toAppError } from '../../../../shared/errors';
import { localizeMessage, useI18n } from '../../../i18n';
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalLayout,
} from '../../../components/modal-layout';
import { describeDeleteWorkspaceError } from '../workspace-error-messages';

export interface DeleteWorkspaceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspace: Workspace;
  readonly deleteWorkspace: DeleteWorkspace;
  readonly actorUserId: string;
  readonly onDeleted: () => void;
  readonly surface?: 'brand' | 'stitch';
}

export function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  deleteWorkspace,
  actorUserId,
  onDeleted,
  surface = 'brand',
}: DeleteWorkspaceDialogProps): ReactNode {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setFormError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await deleteWorkspace({
        id: workspace.id.value,
        actorUserId,
      });
      switch (result.status) {
        case 'ok':
          onDeleted();
          onOpenChange(false);
          break;
        case 'invalid-input':
          setFormError(t('errors.deleteWorkspaceFailed'));
          break;
        case 'error':
          setFormError(localizeMessage(t, describeDeleteWorkspaceError(result.error)));
          break;
      }
    } catch (error) {
      setFormError(localizeMessage(t, describeDeleteWorkspaceError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent {...(surface === 'stitch' ? { 'data-surface': 'stitch' } : {})}>
        <ModalLayout>
          <ModalHeader>
            <DialogHeader>
              <DialogTitle>{t('workspaces.deleteDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('workspaces.deleteDialog.description', { name: workspace.name })}
              </DialogDescription>
            </DialogHeader>
          </ModalHeader>
          <ModalBody>
            <Stack gap="space-4">
              {formError !== null && (
                <Text role="alert" color="color.text.danger">
                  {formError}
                </Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={submitting}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {t('workspaces.deleteDialog.confirm')}
              </Button>
            </DialogFooter>
          </ModalFooter>
        </ModalLayout>
      </ModalContent>
    </Dialog>
  );
}
