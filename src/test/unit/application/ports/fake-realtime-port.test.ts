import { WorkspaceId } from '../../../../domain/shared';
import { describeRealtimePortContract } from '../../../contract/realtime-port-contract';
import { FakeRealtimePort } from '../../../fixtures/fake-realtime-port';

describeRealtimePortContract('FakeRealtimePort', () => {
  const fake = new FakeRealtimePort();
  return {
    port: fake,
    emit: (event) => fake.emit(event),
    emitError: (workspaceId, error) => fake.emitError(workspaceId, error),
    activeSubscriptionCount: (workspaceId) => fake.activeSubscriptionCount(workspaceId),
  };
});

describe('FakeRealtimePort', () => {
  it('counts each subscribe call separately even for the same listener', () => {
    const fake = new FakeRealtimePort();
    const workspaceId = WorkspaceId.create('ws-1');
    const listener = jest.fn();

    fake.subscribe(workspaceId, listener);
    fake.subscribe(workspaceId, listener);

    expect(fake.activeSubscriptionCount(workspaceId)).toBe(2);
  });

  it('totals active subscriptions across workspaces', () => {
    const fake = new FakeRealtimePort();
    const first = WorkspaceId.create('ws-1');
    const second = WorkspaceId.create('ws-2');

    fake.subscribe(first, jest.fn());
    fake.subscribe(first, jest.fn());
    fake.subscribe(second, jest.fn());

    expect(fake.activeSubscriptionCount()).toBe(3);
    expect(fake.activeSubscriptionCount(first)).toBe(2);
    expect(fake.activeSubscriptionCount(second)).toBe(1);
  });

  it('ignores events emitted for a workspace without subscribers', () => {
    const fake = new FakeRealtimePort();
    const workspaceId = WorkspaceId.create('ws-1');

    expect(() =>
      fake.emit({
        workspaceId,
        changes: [],
      }),
    ).not.toThrow();
  });
});
