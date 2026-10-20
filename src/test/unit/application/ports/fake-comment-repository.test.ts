import { FakeCommentRepository } from '../../../fixtures/fake-comment-repository';
import { describeCommentRepositoryContract } from '../../../contract/comment-repository-contract';

describeCommentRepositoryContract(
  'FakeCommentRepository contract',
  () => new FakeCommentRepository(),
);
