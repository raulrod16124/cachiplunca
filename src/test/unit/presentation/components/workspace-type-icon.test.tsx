import { render } from '../../../setup/render-with-theme';
import { WorkspaceTypeIcon } from '../../../../presentation/components/workspace-type-icon';
import { WORKSPACE_TYPES } from '../../../../domain/workspace';

describe('WorkspaceTypeIcon', () => {
  it.each(WORKSPACE_TYPES)('renders a decorative icon for the %s type', (type) => {
    const { container } = render(<WorkspaceTypeIcon type={type} />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a different icon per type', () => {
    const classes = WORKSPACE_TYPES.map((type) => {
      const { container, unmount } = render(<WorkspaceTypeIcon type={type} />);
      const className = container.querySelector('svg')?.getAttribute('class') ?? '';
      unmount();
      return className;
    });

    expect(new Set(classes).size).toBe(WORKSPACE_TYPES.length);
  });
});
