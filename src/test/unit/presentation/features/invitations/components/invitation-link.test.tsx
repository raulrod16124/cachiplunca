import { fireEvent, render, screen } from '@testing-library/react';
import { setPublicBasePath } from '../../../../../../presentation/config/public-base';
import {
  buildInvitationLink,
  InvitationLink,
} from '../../../../../../presentation/features/invitations/components/invitation-link';

const writeText = jest.fn<Promise<void>, [string]>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  setPublicBasePath('/');
});

describe('buildInvitationLink', () => {
  it('builds an absolute link from an explicit origin', () => {
    expect(buildInvitationLink('token-abc', 'https://app.test')).toBe(
      'https://app.test/invitations/token-abc',
    );
  });

  it('prepends the public base path when set', () => {
    setPublicBasePath('/cachiplunca');
    expect(buildInvitationLink('token-abc', 'https://app.test')).toBe(
      'https://app.test/cachiplunca/invitations/token-abc',
    );
  });
});

describe('InvitationLink', () => {
  it('shows the one-time link built from the token', () => {
    render(<InvitationLink token="token-abc" buildLink={(token) => `/invitations/${token}`} />);

    expect(screen.getByLabelText('Invitation link')).toHaveValue('/invitations/token-abc');
  });

  it('copies the link to the clipboard and confirms', async () => {
    render(<InvitationLink token="token-abc" buildLink={(token) => `/invitations/${token}`} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith('/invitations/token-abc');
    expect(await screen.findByText('Link copied to clipboard.')).toBeInTheDocument();
  });
});
