import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { Card } from '../../../../presentation/components/card';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('Card', () => {
  it('renders a tokenized surface by default', () => {
    const { container } = render(<Card>Workspace summary</Card>);
    const card = container.firstElementChild;

    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Workspace summary');

    const css = styleText();
    expect(css).toContain('var(--rr-color-background-surface)');
    expect(css).toContain('var(--rr-color-border-default)');
    expect(css).toContain('var(--rr-radius-lg)');
    expect(css).toContain('var(--rr-space-4)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('maps variants to surface, raised and sunken tokens', () => {
    const sunken = render(<Card variant="sunken" />);
    const sunkenClass = sunken.container.firstElementChild?.className;
    expect(styleText()).toContain('var(--rr-color-background-sunken)');

    const raised = render(<Card variant="raised" />);
    const raisedClass = raised.container.firstElementChild?.className;
    expect(styleText()).toContain('var(--rr-shadow-md)');
    expect(raisedClass).not.toBe(sunkenClass);
  });

  it('maps padding presets to spacing tokens', () => {
    render(<Card padding="lg" />);
    expect(styleText()).toContain('var(--rr-space-6)');

    render(<Card padding="none" />);
    expect(styleText()).toContain('padding:0');
  });

  it('adds hover motion only when interactive and respects reduced motion', () => {
    render(<Card interactive />);

    const css = styleText();
    expect(css).toContain(':hover');
    expect(css).toContain('translateY(-1px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('forwards semantics and attributes when rendered as another element', () => {
    const onClick = jest.fn();
    render(
      <Card as="article" aria-label="Workspace summary" className="custom-card" onClick={onClick}>
        Body
      </Card>,
    );

    const card = screen.getByRole('article', { name: 'Workspace summary' });
    expect(card).toHaveClass('custom-card');
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
