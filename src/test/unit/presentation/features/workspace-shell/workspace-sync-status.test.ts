import { describeSyncStatus } from '../../../../../presentation/features/workspace-shell/workspace-sync-status';

describe('describeSyncStatus', () => {
  it('hides the badge while idle', () => {
    expect(describeSyncStatus('idle')).toBeNull();
  });

  it('maps saving to an informational badge', () => {
    expect(describeSyncStatus('saving')).toEqual({ label: 'Saving…', variant: 'info' });
  });

  it('maps saved to a success badge', () => {
    expect(describeSyncStatus('saved')).toEqual({ label: 'Saved', variant: 'success' });
  });

  it('maps error to a destructive badge', () => {
    expect(describeSyncStatus('error')).toEqual({ label: 'Not saved', variant: 'destructive' });
  });
});
