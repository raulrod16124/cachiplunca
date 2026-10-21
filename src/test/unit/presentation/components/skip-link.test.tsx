import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { SkipLink } from '../../../../presentation/components/skip-link';

describe('SkipLink', () => {
  it('renders an accessible link to the main content landmark', () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Content
        </main>
      </>,
    );

    const link = screen.getByRole('link', { name: 'Skip to main content' });

    expect(link).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });
});
