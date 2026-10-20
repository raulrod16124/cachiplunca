import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { FieldError } from '../../../../presentation/components/field-error';

describe('FieldError', () => {
  it('renders nothing when no message', () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders error message with alert role and optional id', () => {
    render(<FieldError id="workspace-name-error" message="Invalid email" />);
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'workspace-name-error');
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });
});
