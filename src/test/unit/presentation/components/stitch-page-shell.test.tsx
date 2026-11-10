import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import {
  BoardsContainer,
  BoardsFooter,
  BoardsMain,
} from '../../../../presentation/components/stitch-page-shell';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('Stitch page shell footer', () => {
  it('renders the footer as a contentinfo landmark', () => {
    render(
      <BoardsMain>
        <BoardsContainer>
          <p>Board list</p>
          <BoardsFooter>
            <span>© 2026 Cachiplunca. All rights reserved.</span>
          </BoardsFooter>
        </BoardsContainer>
      </BoardsMain>,
    );

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '© 2026 Cachiplunca. All rights reserved.',
    );
  });

  it('anchors the footer to the bottom of the main content area', () => {
    render(
      <BoardsMain>
        <BoardsContainer>
          <BoardsFooter>
            <span>Copyright</span>
          </BoardsFooter>
        </BoardsContainer>
      </BoardsMain>,
    );

    const css = styleText().replace(/\s+/g, '');
    expect(css).toContain('flex-direction:column');
    expect(css).toContain('flex:11auto');
    expect(css).toContain('margin-top:auto');
  });
});
