import { WORKSPACE_TYPES, type WorkspaceType } from '../../../domain/workspace';
import type { TranslationKey } from '../../i18n';

export const WORKSPACE_TYPE_LABEL_KEYS: Record<WorkspaceType, TranslationKey> = {
  general: 'workspaces.type.general',
  work: 'workspaces.type.work',
  travel: 'workspaces.type.travel',
  tasks: 'workspaces.type.tasks',
  ideas: 'workspaces.type.ideas',
};

export function isWorkspaceType(value: string): value is WorkspaceType {
  return (WORKSPACE_TYPES as readonly string[]).includes(value);
}
