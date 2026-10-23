import { screen } from '@testing-library/react';
import { render } from '../../../../../setup/render-with-theme';
import { WorkspaceTitleField } from '../../../../../../presentation/features/workspace-shell/components/workspace-title-field';
import { appTheme } from '../../../../../../presentation/styles';

describe('WorkspaceTitleField', () => {
  it('renders the workspace name as a read-only heading', () => {
    render(<WorkspaceTitleField name="Roadmap Q4" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Roadmap Q4' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Workspace name' })).not.toBeInTheDocument();
  });

  it('renders the title at a reduced size that wraps to two lines', () => {
    render(
      <WorkspaceTitleField name="A very long workspace name that has to wrap onto several lines" />,
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveStyle({ fontSize: appTheme.font.size.sm });
    expect(heading).toHaveStyle({ overflow: 'hidden' });
    expect(heading).not.toHaveStyle({ whiteSpace: 'nowrap' });
  });
});
