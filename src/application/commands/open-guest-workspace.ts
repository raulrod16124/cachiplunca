import type { GuestLink } from '../../domain/guest-link';
import type { Element } from '../../domain/element';
import { UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import type { AuthUser, GuestLinkRepository } from '../ports';
import { isAppError, type AppError } from '../../shared/errors';
import type { GetWorkspace, LoadWorkspaceElements } from '../queries';
import { toValidationAppError } from './to-validation-app-error';

export interface OpenGuestWorkspaceInput {
  readonly token: string;
  readonly currentUserId?: string;
}

export type OpenGuestWorkspaceResult =
  | {
      readonly status: 'ok';
      readonly link: GuestLink;
      readonly workspace: Workspace;
      readonly elements: Element[];
    }
  | { readonly status: 'invalid' }
  | { readonly status: 'revoked' }
  | { readonly status: 'error'; readonly error: AppError };

export type OpenGuestWorkspace = (
  input: OpenGuestWorkspaceInput,
) => Promise<OpenGuestWorkspaceResult>;

export interface OpenGuestWorkspaceDeps {
  readonly guestLinkRepository: GuestLinkRepository;
  readonly hashToken: (token: string) => Promise<string>;
  readonly signInAnonymously: () => Promise<AuthUser>;
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
}

export function createOpenGuestWorkspace(deps: OpenGuestWorkspaceDeps): OpenGuestWorkspace {
  return async (input: OpenGuestWorkspaceInput): Promise<OpenGuestWorkspaceResult> => {
    const token = input.token.trim();
    if (token.length === 0) {
      return { status: 'invalid' };
    }

    try {
      const tokenHash = await deps.hashToken(token);
      const link = await deps.guestLinkRepository.findByTokenHash(tokenHash);

      if (link === null) {
        return { status: 'invalid' };
      }

      if (!link.isActive()) {
        return { status: 'revoked' };
      }

      const currentUserId = input.currentUserId?.trim();
      const userId =
        currentUserId !== undefined && currentUserId.length > 0
          ? currentUserId
          : (await deps.signInAnonymously()).uid;

      await deps.guestLinkRepository.openSession({
        userId: UserId.create(userId),
        workspaceId: link.workspaceId,
        tokenHash: link.tokenHash,
      });

      const workspace = await deps.getWorkspace(link.workspaceId.value);
      if (workspace.status === 'notFound') {
        return { status: 'invalid' };
      }
      if (workspace.status === 'error') {
        return { status: 'error', error: workspace.error };
      }

      const elements = await deps.loadWorkspaceElements(link.workspaceId.value);
      if (elements.status === 'error') {
        return { status: 'error', error: elements.error };
      }

      return {
        status: 'ok',
        link,
        workspace: workspace.workspace,
        elements: elements.elements,
      };
    } catch (error) {
      return {
        status: 'error',
        error: isAppError(error) ? error : toValidationAppError(error),
      };
    }
  };
}
