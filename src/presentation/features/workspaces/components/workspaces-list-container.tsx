import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DeleteWorkspace } from '../../../../application/commands';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../../../application/queries/list-workspaces';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { toAppError } from '../../../../shared/errors';
import { describeListWorkspacesError } from '../workspace-error-messages';
import { localizeMessage, useI18n } from '../../../i18n';
import { DeleteWorkspaceDialog } from './delete-workspace-dialog';
import { WorkspacesList } from './workspaces-list';

export interface WorkspacesListContainerProps {
  readonly userId: string;
  readonly listWorkspaces: ListWorkspaces;
  readonly deleteWorkspace?: DeleteWorkspace;
  readonly onCreateWorkspace: () => void;
  readonly refreshToken?: number;
}

export function WorkspacesListContainer({
  userId,
  listWorkspaces,
  deleteWorkspace,
  onCreateWorkspace,
  refreshToken = 0,
}: WorkspacesListContainerProps): ReactNode {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ListWorkspacesResult | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);

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

  return (
    <>
      <WorkspacesList
        status={status}
        workspaces={workspaces}
        rolesByWorkspaceId={rolesByWorkspaceId}
        errorMessage={errorMessage}
        onRetry={fetchWorkspaces}
        onCreate={onCreateWorkspace}
        onSelect={handleSelectWorkspace}
        onRequestDelete={deleteWorkspace === undefined ? undefined : handleRequestDelete}
      />
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
    </>
  );
}

const EMPTY_ROLES: ReadonlyMap<string, MembershipRole> = new Map();
