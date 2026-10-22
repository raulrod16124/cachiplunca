import { WORKSPACE_NAME_MAX_LENGTH } from '../../domain/workspace';

export function validateWorkspaceName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Enter a board name.';
  }
  if (trimmed.length > WORKSPACE_NAME_MAX_LENGTH) {
    return `Board name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters.`;
  }
  return undefined;
}
