import { fireEvent, render, screen } from '@testing-library/react';
import {
  CopyLinkField,
  linkDisplayAddress,
} from '../../../../presentation/components/copy-link-field';

const writeText = jest.fn<Promise<void>, [string]>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

describe('linkDisplayAddress', () => {
  it('shows the host of an absolute link', () => {
    expect(linkDisplayAddress('https://app.example.test/invitations/token')).toBe(
      'app.example.test',
    );
  });

  it('falls back to the full value for relative links', () => {
    expect(linkDisplayAddress('/invitations/token')).toBe('/invitations/token');
  });
});

describe('CopyLinkField', () => {
  it('shows the complete link in a readonly control and copies it', async () => {
    const link = 'https://app.example.test/invitations/a-very-long-token-value';
    render(<CopyLinkField link={link} label="Invitation link" hint="Share this link." />);

    expect(screen.getByText('app.example.test')).toBeInTheDocument();
    expect(screen.getByLabelText('Invitation link')).toHaveValue(link);
    expect(screen.getByText('Share this link.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith(link);
    expect(await screen.findByText('Link copied to clipboard.')).toBeInTheDocument();
  });

  it('shows an accessible error when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<CopyLinkField link="/invitations/token" label="Invitation link" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(
      await screen.findByText('We could not copy the link. Select it and copy it manually.'),
    ).toBeInTheDocument();
  });
});
