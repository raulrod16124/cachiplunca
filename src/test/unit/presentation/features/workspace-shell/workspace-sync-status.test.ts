import {
  describeConnectionStatus,
  describeSyncStatus,
} from '../../../../../presentation/features/workspace-shell/workspace-sync-status';

describe('describeSyncStatus', () => {
  it('hides the badge while idle', () => {
    expect(describeSyncStatus('idle')).toBeNull();
  });

  it('maps saving to a spinner icon', () => {
    expect(describeSyncStatus('saving')).toEqual({
      label: 'Saving…',
      variant: 'info',
      icon: 'spinner',
    });
  });

  it('maps saved to a cloud-check icon', () => {
    expect(describeSyncStatus('saved')).toEqual({
      label: 'Saved',
      variant: 'success',
      icon: 'cloud-check',
    });
  });

  it('maps error to an alert icon', () => {
    expect(describeSyncStatus('error')).toEqual({
      label: 'Not saved',
      variant: 'destructive',
      icon: 'alert',
    });
  });
});

describe('describeConnectionStatus', () => {
  it('hides the badge while connected', () => {
    expect(describeConnectionStatus('connected')).toBeNull();
  });

  it('maps reconnecting to a warning badge', () => {
    expect(describeConnectionStatus('reconnecting')).toEqual({
      label: 'Reconnecting…',
      variant: 'warning',
    });
  });
});
