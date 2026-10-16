import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { FieldError } from '../../../../presentation/components/field-error';

describe('FieldError', () => {
  it('renders nothing when no message', () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders error message with alert role', () => {
    render(<FieldError message="Invalid email" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });
});
