import type { WorkspaceId } from '../../domain/shared';

export type RecordWorkspaceActivity = (workspaceId: WorkspaceId, at: Date) => Promise<void>;

export async function recordActivityBestEffort(
  recordActivity: RecordWorkspaceActivity | undefined,
  workspaceId: WorkspaceId,
  at: Date,
): Promise<void> {
  if (recordActivity === undefined) {
    return;
  }

  try {
    await recordActivity(workspaceId, at);
  } catch {
    return;
  }
}
