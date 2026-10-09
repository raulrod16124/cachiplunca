import { WORKSPACE_NAME_MAX_LENGTH } from '../../domain/workspace';

export function validateWorkspaceName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Enter a workspace name.';
  }
  if (trimmed.length > WORKSPACE_NAME_MAX_LENGTH) {
    return `Workspace name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters.`;
  }
  return undefined;
}
