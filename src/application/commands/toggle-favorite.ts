import { Favorite } from '../../domain/favorite';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { FavoriteRepository, MembershipRepository } from '../ports';

export interface ToggleFavoriteInput {
  readonly userId: string;
  readonly workspaceId: string;
  readonly favorited: boolean;
}

export type ToggleFavoriteFieldName = 'userId' | 'workspaceId' | 'favorited';

export type ToggleFavoriteFieldErrors = Partial<Record<ToggleFavoriteFieldName, string>>;

export type ToggleFavoriteResult =
  | { readonly status: 'ok'; readonly favorited: boolean }
  | { readonly status: 'invalid-input'; readonly fieldErrors: ToggleFavoriteFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type ToggleFavorite = (input: ToggleFavoriteInput) => Promise<ToggleFavoriteResult>;

export interface ToggleFavoriteDeps {
  readonly favoriteRepository: FavoriteRepository;
  readonly membershipRepository: MembershipRepository;
}

export function validateToggleFavoriteInput(input: ToggleFavoriteInput): ToggleFavoriteFieldErrors {
  const fieldErrors: ToggleFavoriteFieldErrors = {};

  if (input.userId.trim().length === 0) {
    fieldErrors.userId = 'Enter a user id.';
  }

  if (input.workspaceId.trim().length === 0) {
    fieldErrors.workspaceId = 'Enter a workspace id.';
  }

  if (typeof input.favorited !== 'boolean') {
    fieldErrors.favorited = 'Choose whether the board is a favorite.';
  }

  return fieldErrors;
}

export function createToggleFavorite({
  favoriteRepository,
  membershipRepository,
}: ToggleFavoriteDeps): ToggleFavorite {
  return async (input: ToggleFavoriteInput): Promise<ToggleFavoriteResult> => {
    const fieldErrors = validateToggleFavoriteInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    const userId = UserId.create(input.userId);
    const workspaceId = WorkspaceId.create(input.workspaceId);

    try {
      const membership = await membershipRepository.findByUserAndWorkspace(userId, workspaceId);

      if (membership === null) {
        return { status: 'error', error: forbiddenError(workspaceId) };
      }

      if (input.favorited) {
        await favoriteRepository.add(Favorite.create({ userId, workspaceId }));
        return { status: 'ok', favorited: true };
      }

      await favoriteRepository.remove(userId, workspaceId);
      return { status: 'ok', favorited: false };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function forbiddenError(workspaceId: WorkspaceId): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to favorite this board.',
    { details: { workspaceId: workspaceId.value } },
  );
}
