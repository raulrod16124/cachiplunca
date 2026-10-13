import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { SessionLoading } from '../../../../presentation/components/session-loading';

describe('SessionLoading', () => {
  it('renders with status role and message', () => {
    render(<SessionLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Restoring your session…')).toBeInTheDocument();
  });
});
