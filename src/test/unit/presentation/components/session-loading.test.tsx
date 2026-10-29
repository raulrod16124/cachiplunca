import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { localeWrapper } from '../../../setup/locale-wrapper';
import { SessionLoading } from '../../../../presentation/components/session-loading';
import { MESSAGES } from '../../../../presentation/i18n';

describe('SessionLoading', () => {
  it('renders the full-page loading screen with the session message', () => {
    render(<SessionLoading />);

    const status = screen.getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(MESSAGES.en['session.restoring'])).toBeInTheDocument();
    expect(screen.getByRole('img', { name: MESSAGES.en['brand.name'] })).toBeInTheDocument();
  });

  it('exposes the loading screen as the main landmark', () => {
    render(<SessionLoading />);

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('renders the message in Spanish', () => {
    render(<SessionLoading />, { wrapper: localeWrapper('es') });
    expect(screen.getByRole('status')).toHaveTextContent(MESSAGES.es['session.restoring']);
  });
});
