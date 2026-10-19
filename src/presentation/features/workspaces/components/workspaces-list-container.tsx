import { Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  DeleteWorkspace,
  DuplicateWorkspace,
  UpdateWorkspace,
} from '../../../../application/commands';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../../../application/queries/list-workspaces';
import { sortWorkspacesForList } from '../../../../application/queries';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { toAppError } from '../../../../shared/errors';
import {
  describeDuplicateWorkspaceError,
  describeListWorkspacesError,
} from '../workspace-error-messages';
import { localizeMessage, useI18n } from '../../../i18n';
import { DeleteWorkspaceDialog } from './delete-workspace-dialog';
import { EditWorkspaceDialog } from './edit-workspace-dialog';
import { WorkspacesList } from './workspaces-list';

export interface WorkspacesListContainerProps {
  readonly userId: string;
  readonly listWorkspaces: ListWorkspaces;
  readonly deleteWorkspace?: DeleteWorkspace;
  readonly duplicateWorkspace?: DuplicateWorkspace;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly onCreateWorkspace: () => void;
  readonly refreshToken?: number;
}

export function WorkspacesListContainer({
  userId,
  listWorkspaces,
  deleteWorkspace,
  duplicateWorkspace,
  updateWorkspace,
  onCreateWorkspace,
  refreshToken = 0,
}: WorkspacesListContainerProps): ReactNode {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ListWorkspacesResult | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(null);
  const [duplicatingWorkspaceId, setDuplicatingWorkspaceId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      const response = await listWorkspaces(userId);
      setResult(response);
      setStatus(response.status === 'ok' ? 'success' : 'error');
    } catch (error) {
      setResult({ status: 'error', error: toAppError(error) });
      setStatus('error');
    }
  }, [listWorkspaces, userId]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces, refreshToken]);

  const errorMessage =
    result?.status === 'error'
      ? localizeMessage(t, describeListWorkspacesError(result.error))
      : undefined;
  const workspaces = result?.status === 'ok' ? result.workspaces : [];
  const rolesByWorkspaceId = result?.status === 'ok' ? result.rolesByWorkspaceId : EMPTY_ROLES;

  const handleSelectWorkspace = useCallback(
    (workspace: Workspace): void => {
      navigate(`/workspaces/${workspace.id.value}`);
    },
    [navigate],
  );

  const handleRequestDelete = useCallback(
    (workspace: Workspace): void => {
      if (deleteWorkspace === undefined) {
        return;
      }
      setWorkspaceToDelete(workspace);
    },
    [deleteWorkspace],
  );

  const handleDeleted = useCallback((): void => {
    setWorkspaceToDelete(null);
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleRequestEdit = useCallback(
    (workspace: Workspace): void => {
      if (updateWorkspace === undefined) {
        return;
      }
      setWorkspaceToEdit(workspace);
    },
    [updateWorkspace],
  );

  const handleEdited = useCallback((workspace: Workspace): void => {
    setWorkspaceToEdit(null);
    setResult((previous) => {
      if (previous === null || previous.status !== 'ok') {
        return previous;
      }

      return {
        status: 'ok',
        workspaces: sortWorkspacesForList(
          previous.workspaces.map((candidate) =>
            candidate.id.equals(workspace.id) ? workspace : candidate,
          ),
        ),
        rolesByWorkspaceId: previous.rolesByWorkspaceId,
      };
    });
  }, []);

  const handleDuplicate = useCallback(
    async (workspace: Workspace): Promise<void> => {
      if (duplicateWorkspace === undefined || duplicatingWorkspaceId !== null) {
        return;
      }

      setDuplicatingWorkspaceId(workspace.id.value);
      setDuplicateError(null);

      try {
        const response = await duplicateWorkspace({
          sourceWorkspaceId: workspace.id.value,
          actorUserId: userId,
        });
        switch (response.status) {
          case 'ok':
            setResult((previous) => {
              if (previous === null || previous.status !== 'ok') {
                return previous;
              }

              const roles = new Map(previous.rolesByWorkspaceId);
              roles.set(response.workspace.id.value, 'owner');

              return {
                status: 'ok',
                workspaces: sortWorkspacesForList([...previous.workspaces, response.workspace]),
                rolesByWorkspaceId: roles,
              };
            });
            break;
          case 'invalid-input':
            setDuplicateError(t('errors.duplicateWorkspaceFailed'));
            break;
          case 'error':
            setDuplicateError(localizeMessage(t, describeDuplicateWorkspaceError(response.error)));
            break;
        }
      } catch (error) {
        setDuplicateError(localizeMessage(t, describeDuplicateWorkspaceError(toAppError(error))));
      } finally {
        setDuplicatingWorkspaceId(null);
      }
    },
    [duplicateWorkspace, duplicatingWorkspaceId, t, userId],
  );

  return (
    <>
      <Stack gap="space-4">
        {duplicateError !== null && (
          <Text role="alert" color="color.text.danger">
            {duplicateError}
          </Text>
        )}
        <WorkspacesList
          status={status}
          workspaces={workspaces}
          rolesByWorkspaceId={rolesByWorkspaceId}
          errorMessage={errorMessage}
          onRetry={fetchWorkspaces}
          onCreate={onCreateWorkspace}
          onSelect={handleSelectWorkspace}
          onRequestDelete={deleteWorkspace === undefined ? undefined : handleRequestDelete}
          onDuplicate={duplicateWorkspace === undefined ? undefined : handleDuplicate}
          onEdit={updateWorkspace === undefined ? undefined : handleRequestEdit}
          duplicatingWorkspaceId={duplicatingWorkspaceId}
        />
      </Stack>
      {workspaceToDelete !== null && deleteWorkspace !== undefined && (
        <DeleteWorkspaceDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setWorkspaceToDelete(null);
            }
          }}
          workspace={workspaceToDelete}
          deleteWorkspace={deleteWorkspace}
          actorUserId={userId}
          onDeleted={handleDeleted}
        />
      )}
      {workspaceToEdit !== null && updateWorkspace !== undefined && (
        <EditWorkspaceDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setWorkspaceToEdit(null);
            }
          }}
          workspace={workspaceToEdit}
          updateWorkspace={updateWorkspace}
          onUpdated={handleEdited}
        />
      )}
    </>
  );
}

const EMPTY_ROLES: ReadonlyMap<string, MembershipRole> = new Map();
