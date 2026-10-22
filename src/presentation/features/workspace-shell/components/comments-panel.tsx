import { Badge, Button, Heading, Text, Textarea } from '@raulrod/ui';
import { Check, MessageSquare } from '@raulrod/icons';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import type { CommentServices } from '../../../../application/comment-services';
import type { Comment } from '../../../../domain/comment';
import { COMMENT_BODY_MAX_LENGTH } from '../../../../domain/comment';
import { richTextToPlain, type Element, type ElementType } from '../../../../domain/element';
import { ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { shortUserId } from '../../../collaboration';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { Panel as SharedPanel } from '../../../components/panel';
import { PanelHeader } from '../../../components/panel-header';
import { formatRelativeDate, useI18n, type TranslationKey } from '../../../i18n';
import { describeCommentError } from '../comments-error-messages';
import { SideDrawer } from './side-drawer';

const ELEMENT_TYPE_KEYS: Readonly<Record<ElementType, TranslationKey>> = {
  text: 'commandPalette.element.text',
  note: 'commandPalette.element.note',
  task: 'commandPalette.element.task',
  frame: 'commandPalette.element.frame',
  link: 'commandPalette.element.link',
  image: 'commandPalette.element.image',
  connector: 'comments.element.connector',
};

const PanelLayout = styled.div`
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.canvas.surface};

  & > aside {
    flex: 1 1 auto;
    min-height: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
`;

const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space[4]};
`;

const CommentList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin: 0;
  padding: 0;
  list-style: none;

  & > li {
    gap: ${({ theme }) => theme.space[2]};
  }
`;

const CommentMeta = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
`;

const CommentAuthor = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CommentTimestamps = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[1]};
`;

const CommentText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: ${({ theme }) => theme.font.leading.normal};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const InlineEditForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const StatusMessage = styled(Text)`
  display: block;
  padding: ${({ theme }) => `${theme.space[2]} 0`};
`;

export interface CommentsPanelProps {
  readonly open: boolean;
  readonly workspaceId: string;
  readonly element: Element | undefined;
  readonly currentUserId: string | undefined;
  readonly authorLabels?: ReadonlyMap<string, string>;
  readonly services?: CommentServices;
  readonly onCommentSaved?: (comment: Comment) => void;
  readonly onClose: () => void;
}

export function CommentsPanel({
  open,
  workspaceId,
  element,
  currentUserId,
  authorLabels,
  services,
  onCommentSaved,
  onClose,
}: CommentsPanelProps): ReactNode {
  const { t, locale } = useI18n();
  const elementId = element?.id.value;
  const [comments, setComments] = useState<readonly Comment[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const targetLabel = useMemo(() => {
    if (element === undefined) {
      return null;
    }

    const type = t(ELEMENT_TYPE_KEYS[element.type]);
    const title = elementTitle(element);

    return title.length === 0 ? type : t('comments.target', { type, title });
  }, [element, t]);

  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditDraft('');
    setStatusMessage(null);

    if (!open || services === undefined || elementId === undefined) {
      setComments([]);
      setStatus('idle');
      setErrorMessage(null);
      return;
    }

    let active = true;
    setStatus('loading');
    setErrorMessage(null);

    services
      .listComments({ workspaceId, elementId })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.status === 'ok') {
          setComments(result.comments);
          setStatus('ready');
          return;
        }
        setComments([]);
        setErrorMessage(t(describeCommentError('load', result.error)));
        setStatus('error');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setComments([]);
        setErrorMessage(t(describeCommentError('load', toAppError(error))));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [elementId, open, reloadKey, services, t, workspaceId]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (services === undefined || currentUserId === undefined || elementId === undefined) {
        return;
      }

      const body = draft.trim();
      if (body.length === 0) {
        return;
      }

      setSubmitting(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        const result = await services.createComment({
          workspaceId: WorkspaceId.create(workspaceId),
          elementId: ElementId.create(elementId),
          authorId: UserId.create(currentUserId),
          body,
        });

        if (result.status === 'ok') {
          setComments((current) => [...current, result.comment]);
          setDraft('');
          setStatus('ready');
          onCommentSaved?.(result.comment);
        } else {
          setErrorMessage(t(describeCommentError('create', result.error)));
        }
      } catch (error) {
        setErrorMessage(t(describeCommentError('create', toAppError(error))));
      } finally {
        setSubmitting(false);
      }
    },
    [currentUserId, draft, elementId, onCommentSaved, services, t, workspaceId],
  );

  const handleResolve = useCallback(
    async (comment: Comment): Promise<void> => {
      if (services === undefined) {
        return;
      }

      setResolvingId(comment.id.value);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        const result = await services.resolveComment({
          workspaceId,
          commentId: comment.id.value,
        });

        if (result.status === 'ok') {
          setComments((current) =>
            current.map((entry) =>
              entry.id.value === result.comment.id.value ? result.comment : entry,
            ),
          );
          onCommentSaved?.(result.comment);
        } else {
          setErrorMessage(t(describeCommentError('resolve', result.error)));
        }
      } catch (error) {
        setErrorMessage(t(describeCommentError('resolve', toAppError(error))));
      } finally {
        setResolvingId(null);
      }
    },
    [onCommentSaved, services, t, workspaceId],
  );

  const handleStartEdit = useCallback((comment: Comment): void => {
    setEditingId(comment.id.value);
    setEditDraft(comment.body);
    setErrorMessage(null);
    setStatusMessage(null);
  }, []);

  const handleCancelEdit = useCallback((): void => {
    setEditingId(null);
    setEditDraft('');
  }, []);

  const handleSaveEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (services === undefined || currentUserId === undefined || editingId === null) {
        return;
      }

      const body = editDraft.trim();
      if (body.length === 0) {
        return;
      }

      setSavingEdit(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        const result = await services.editComment({
          workspaceId,
          commentId: editingId,
          actorId: currentUserId,
          body,
        });

        if (result.status === 'ok') {
          setComments((current) =>
            current.map((entry) =>
              entry.id.value === result.comment.id.value ? result.comment : entry,
            ),
          );
          setEditingId(null);
          setEditDraft('');
          setStatusMessage(t('comments.edit.saved'));
          onCommentSaved?.(result.comment);
        } else {
          setErrorMessage(t(describeCommentError('edit', result.error)));
        }
      } catch (error) {
        setErrorMessage(t(describeCommentError('edit', toAppError(error))));
      } finally {
        setSavingEdit(false);
      }
    },
    [currentUserId, editDraft, editingId, onCommentSaved, services, t, workspaceId],
  );

  if (!open || services === undefined) {
    return null;
  }

  const canComment = currentUserId !== undefined && elementId !== undefined;
  const busy = submitting || resolvingId !== null || savingEdit;
  const authoredLabel = (comment: Comment): string =>
    authorLabels?.get(comment.authorId.value) ?? shortUserId(comment.authorId.value);

  const renderBody = (): ReactNode => {
    if (elementId === undefined) {
      return (
        <EmptyState
          title={t('comments.selectElement.title')}
          description={t('comments.selectElement.description')}
        />
      );
    }

    if (status === 'idle' || status === 'loading') {
      return (
        <StatusMessage role="status" color="color.text.muted">
          {t('comments.loading')}
        </StatusMessage>
      );
    }

    if (status === 'error') {
      return (
        <ErrorBody
          title={t('comments.error.title')}
          message={errorMessage}
          retryLabel={t('common.retry')}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      );
    }

    if (comments.length === 0) {
      return (
        <EmptyState
          title={t('comments.empty.title')}
          description={t('comments.empty.description')}
        />
      );
    }

    return (
      <CommentList aria-label={t('comments.title')}>
        {comments.map((comment) => {
          const resolved = comment.isResolved();
          const resolving = resolvingId === comment.id.value;
          const editing = editingId === comment.id.value;
          const editable =
            currentUserId !== undefined &&
            comment.authorId.value === currentUserId &&
            comment.canEdit();

          return (
            <Card
              key={comment.id.value}
              as="li"
              variant={resolved ? 'sunken' : 'surface'}
              padding="sm"
              data-resolved={resolved}
              data-testid={`comment-card-${comment.id.value}`}
            >
              <CommentMeta>
                <CommentAuthor>
                  <Text weight="font.weight.semibold" size="font.size.sm">
                    {authoredLabel(comment)}
                  </Text>
                </CommentAuthor>
                <CommentTimestamps>
                  <Text color="color.text.muted" size="font.size.xs">
                    {t('comments.created', {
                      when: formatRelativeDate(comment.createdAt, locale),
                    })}
                  </Text>
                  {comment.editedAt === undefined ? null : (
                    <Text color="color.text.muted" size="font.size.xs">
                      {t('comments.edited', {
                        when: formatRelativeDate(comment.editedAt, locale),
                      })}
                    </Text>
                  )}
                </CommentTimestamps>
              </CommentMeta>
              {editing ? (
                <InlineEditForm onSubmit={(event) => void handleSaveEdit(event)}>
                  <Textarea
                    aria-label={t('comments.editBodyLabel')}
                    rows={3}
                    maxLength={COMMENT_BODY_MAX_LENGTH}
                    value={editDraft}
                    disabled={savingEdit}
                    autoFocus
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        handleCancelEdit();
                      }
                    }}
                  />
                  <CommentActions>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingEdit}
                      onClick={handleCancelEdit}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={savingEdit || editDraft.trim().length === 0}
                    >
                      {savingEdit ? t('comments.edit.saving') : t('comments.edit.save')}
                    </Button>
                  </CommentActions>
                </InlineEditForm>
              ) : (
                <>
                  <CommentText>{comment.body}</CommentText>
                  <CommentActions>
                    {editable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleStartEdit(comment)}
                      >
                        {t('comments.edit')}
                      </Button>
                    ) : null}
                    {resolved ? (
                      <Badge variant="success">
                        <Check aria-hidden="true" size={12} /> {t('comments.resolved')}
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleResolve(comment)}
                      >
                        {resolving ? t('comments.resolving') : t('comments.resolve')}
                      </Button>
                    )}
                  </CommentActions>
                </>
              )}
            </Card>
          );
        })}
      </CommentList>
    );
  };

  return (
    <SideDrawer open onClose={onClose} label={t('comments.title')}>
      <PanelLayout>
        <SharedPanel
          as="aside"
          padding="none"
          id="comments-panel"
          aria-label={t('comments.title')}
          data-testid="comments-panel"
        >
          <PanelHeader
            icon={<MessageSquare aria-hidden="true" size={18} />}
            title={t('comments.title')}
            description={targetLabel ?? undefined}
            onClose={onClose}
            closeLabel={t('comments.close')}
          />
          <Body>
            {statusMessage === null ? null : (
              <StatusMessage role="status" color="color.text.muted">
                {statusMessage}
              </StatusMessage>
            )}
            {errorMessage !== null && status !== 'error' ? (
              <Text role="alert" color="color.text.danger" size="font.size.sm">
                {errorMessage}
              </Text>
            ) : null}
            {renderBody()}
          </Body>
          {elementId === undefined || !canComment ? null : (
            <Form onSubmit={(event) => void handleSubmit(event)}>
              <Textarea
                aria-label={t('comments.bodyLabel')}
                placeholder={t('comments.placeholder')}
                rows={3}
                maxLength={COMMENT_BODY_MAX_LENGTH}
                value={draft}
                disabled={submitting}
                onChange={(event) => setDraft(event.target.value)}
              />
              <FormActions>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={busy || draft.trim().length === 0}
                >
                  {submitting ? t('comments.submitting') : t('comments.submit')}
                </Button>
              </FormActions>
            </Form>
          )}
        </SharedPanel>
      </PanelLayout>
    </SideDrawer>
  );
}

interface ErrorBodyProps {
  readonly title: string;
  readonly message: string | null;
  readonly retryLabel: string;
  readonly onRetry: () => void;
}

function ErrorBody({ title, message, retryLabel, onRetry }: ErrorBodyProps): ReactNode {
  return (
    <div role="alert">
      <Heading as="h3">{title}</Heading>
      {message === null ? null : (
        <Text color="color.text.muted" size="font.size.sm">
          {message}
        </Text>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

function elementTitle(element: Element): string {
  switch (element.type) {
    case 'text':
    case 'note':
      return richTextToPlain(element.content);
    case 'task':
    case 'frame':
      return richTextToPlain(element.title);
    case 'link':
      return element.title === undefined ? element.url : richTextToPlain(element.title);
    case 'image':
      return element.alt === undefined || element.alt.length === 0 ? element.src : element.alt;
    case 'connector':
      return '';
    default: {
      const unknown: never = element;
      return JSON.stringify(unknown);
    }
  }
}
