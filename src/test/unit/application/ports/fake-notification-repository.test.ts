import { FakeNotificationRepository } from '../../../fixtures/fake-notification-repository';
import { describeNotificationRepositoryContract } from '../../../contract/notification-repository-contract';

describeNotificationRepositoryContract(
  'FakeNotificationRepository contract',
  () => new FakeNotificationRepository(),
);
