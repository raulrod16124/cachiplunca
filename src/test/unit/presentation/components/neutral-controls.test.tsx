import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import {
  NeutralButton,
  NeutralIconButton,
} from '../../../../presentation/components/neutral-controls';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('neutral controls', () => {
  it('renders an accessible neutral icon button with the ghost variant', () => {
    render(
      <NeutralIconButton type="button" variant="ghost" label="Neutral action">
        icon
      </NeutralIconButton>,
    );

    expect(screen.getByRole('button', { name: 'Neutral action' })).toHaveClass(
      'rr-icon-button',
      'rr-icon-button--ghost',
    );
  });

  it('uses the sunken background for ghost icon hover instead of the secondary action color', () => {
    render(
      <NeutralIconButton type="button" variant="ghost" label="Neutral action">
        icon
      </NeutralIconButton>,
    );

    const css = styleText();
    expect(css).toContain('.rr-icon-button--ghost');
    expect(css).toContain(':hover:not(:disabled)');
    expect(css).toContain('var(--cach-control-hover)');
    expect(css).not.toContain('var(--rr-color-action-secondary-background)');
  });

  it('keeps the primary variant available for active states', () => {
    render(
      <NeutralIconButton type="button" variant="primary" label="Active action">
        icon
      </NeutralIconButton>,
    );

    const button = screen.getByRole('button', { name: 'Active action' });
    expect(button).toHaveClass('rr-icon-button--primary');
    expect(button).not.toHaveClass('rr-icon-button--ghost');
  });

  it('mutes disabled ghost controls instead of using the hover background', () => {
    render(
      <NeutralIconButton type="button" variant="ghost" disabled label="Disabled action">
        icon
      </NeutralIconButton>,
    );

    expect(screen.getByRole('button', { name: 'Disabled action' })).toBeDisabled();

    const css = styleText();
    expect(css).toContain(':disabled');
    expect(css).toContain('opacity:0.55');
    expect(css).toContain('background:transparent');
  });

  it('uses the sunken background for ghost button hover', () => {
    render(
      <NeutralButton type="button" variant="ghost">
        Neutral button
      </NeutralButton>,
    );

    const css = styleText();
    expect(css).toContain('.rr-button--ghost');
    expect(css).toContain('var(--cach-control-hover)');
    expect(css).not.toContain('var(--rr-color-action-secondary-background)');
  });
});
