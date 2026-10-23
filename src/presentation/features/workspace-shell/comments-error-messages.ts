import type { AppError } from '../../../shared/errors';
import type { TranslationKey } from '../../i18n';

export type CommentErrorAction = 'load' | 'create' | 'edit' | 'resolve';

const ACTION_KEYS: Readonly<Record<CommentErrorAction, TranslationKey>> = {
  load: 'comments.error.description',
  create: 'comments.error.create',
  edit: 'comments.error.edit',
  resolve: 'comments.error.resolve',
};

export function describeCommentError(action: CommentErrorAction, error: AppError): TranslationKey {
  if (error.kind === 'authorization') {
    return 'comments.error.forbidden';
  }
  if (error.kind === 'notFound') {
    return 'comments.error.notFound';
  }
  return ACTION_KEYS[action];
}
