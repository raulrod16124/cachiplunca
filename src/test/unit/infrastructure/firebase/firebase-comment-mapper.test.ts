import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  fromCommentDocument,
  toCommentDocument,
  type CommentDocument,
} from '../../../../infrastructure/firebase/firebase-comment-mapper';

const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');
const RESOLVED_AT = new Date('2026-10-20T11:00:00.000Z');

function makeComment(resolvedAt?: Date): Comment {
  return Comment.create({
    id: CommentId.create('comment-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    elementId: ElementId.create('el-1'),
    authorId: UserId.create('user-1'),
    body: 'Looks good to me',
    createdAt: CREATED_AT,
    resolvedAt,
  });
}

function asRecord(document: CommentDocument): Record<string, unknown> {
  return document as unknown as Record<string, unknown>;
}

describe('comment Firestore mapper', () => {
  it('maps an open comment to a plain document without resolvedAt', () => {
    const document = toCommentDocument(makeComment());

    expect(document.id).toBe('comment-1');
    expect(document.workspaceId).toBe('ws-1');
    expect(document.elementId).toBe('el-1');
    expect(document.authorId).toBe('user-1');
    expect(document.body).toBe('Looks good to me');
    expect(document.createdAt).toEqual(CREATED_AT);
    expect('editedAt' in document).toBe(false);
    expect('resolvedAt' in document).toBe(false);
  });

  it('maps a resolved comment including resolvedAt', () => {
    const document = toCommentDocument(makeComment(RESOLVED_AT));

    expect(document.resolvedAt).toEqual(RESOLVED_AT);
    expect(asRecord(document).resolvedAt).toEqual(RESOLVED_AT);
  });

  it('maps an edited comment including editedAt', () => {
    const editedAt = new Date('2026-10-20T10:10:00.000Z');
    const edited = makeComment().editBody('Updated', editedAt);
    const document = toCommentDocument(edited);

    expect(document.editedAt).toEqual(editedAt);
    expect(asRecord(document).editedAt).toEqual(editedAt);
  });

  it('round-trips open and resolved comments', () => {
    const editedAt = new Date('2026-10-20T10:10:00.000Z');
    const edited = makeComment().editBody('Updated', editedAt);
    for (const comment of [makeComment(), makeComment(RESOLVED_AT), edited]) {
      const restored = fromCommentDocument(toCommentDocument(comment));

      expect(restored.id.equals(comment.id)).toBe(true);
      expect(restored.workspaceId.equals(comment.workspaceId)).toBe(true);
      expect(restored.elementId.equals(comment.elementId)).toBe(true);
      expect(restored.authorId.equals(comment.authorId)).toBe(true);
      expect(restored.body).toBe(comment.body);
      expect(restored.createdAt).toEqual(comment.createdAt);
      expect(restored.editedAt).toEqual(comment.editedAt);
      expect(restored.resolvedAt).toEqual(comment.resolvedAt);
    }
  });

  it('reads Timestamp-like date fields', () => {
    const restored = fromCommentDocument({
      id: 'comment-1',
      workspaceId: 'ws-1',
      elementId: 'el-1',
      authorId: 'user-1',
      body: 'Timestamped',
      createdAt: { toDate: () => CREATED_AT },
      editedAt: { toDate: () => new Date('2026-10-20T10:10:00.000Z') },
      resolvedAt: { toDate: () => RESOLVED_AT },
    });

    expect(restored.createdAt).toEqual(CREATED_AT);
    expect(restored.editedAt).toEqual(new Date('2026-10-20T10:10:00.000Z'));
    expect(restored.resolvedAt).toEqual(RESOLVED_AT);
  });

  it('rejects malformed documents', () => {
    expect(() => fromCommentDocument(null)).toThrow('Comment document must be an object');
    expect(() =>
      fromCommentDocument({
        id: 1,
        workspaceId: 'ws-1',
        elementId: 'el-1',
        authorId: 'user-1',
        body: 'Body',
        createdAt: CREATED_AT,
      }),
    ).toThrow('Comment document field "id" must be a string');
    expect(() =>
      fromCommentDocument({
        id: 'comment-1',
        workspaceId: 'ws-1',
        elementId: 'el-1',
        authorId: 'user-1',
        body: 'Body',
        createdAt: 'yesterday',
      }),
    ).toThrow('Comment document field "createdAt" must be a Date or Timestamp');
    expect(() =>
      fromCommentDocument({
        id: 'comment-1',
        workspaceId: 'ws-1',
        elementId: 'el-1',
        authorId: 'user-1',
        body: 'Body',
        createdAt: CREATED_AT,
        resolvedAt: 'today',
      }),
    ).toThrow('Comment document field "resolvedAt" must be a Date or Timestamp');
  });
});
