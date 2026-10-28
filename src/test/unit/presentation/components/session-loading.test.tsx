import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { localeWrapper } from '../../../setup/locale-wrapper';
import { SessionLoading } from '../../../../presentation/components/session-loading';
import { MESSAGES } from '../../../../presentation/i18n';

describe('SessionLoading', () => {
  it('renders with status role and message', () => {
    render(<SessionLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(MESSAGES.en['session.restoring'])).toBeInTheDocument();
  });

  it('renders the message in Spanish', () => {
    render(<SessionLoading />, { wrapper: localeWrapper('es') });
    expect(screen.getByRole('status')).toHaveTextContent(MESSAGES.es['session.restoring']);
  });
});
