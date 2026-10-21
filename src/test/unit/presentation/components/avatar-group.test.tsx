import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { AvatarGroup } from '../../../../presentation/components/avatar-group';
import type { AvatarGroupItem } from '../../../../presentation/components/avatar-group';

const ITEMS: readonly AvatarGroupItem[] = [
  { id: 'user-1', name: 'Ada Lovelace', color: '#173e2c', testId: 'avatar-user-1' },
  { id: 'user-2', name: 'Grace Hopper', color: '#166534', testId: 'avatar-user-2' },
  { id: 'user-3', name: 'Alan Turing', color: '#365314', testId: 'avatar-user-3' },
  { id: 'user-4', name: 'Katherine Johnson', color: '#4d7c0f', testId: 'avatar-user-4' },
  { id: 'user-5', name: 'Mary Jackson', color: '#5b4a2f', testId: 'avatar-user-5' },
];

describe('AvatarGroup', () => {
  it('renders each avatar with its accessible name, color and test id', () => {
    render(<AvatarGroup items={ITEMS.slice(0, 2)} />);

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Grace Hopper' })).toBeInTheDocument();
    expect(screen.getByTestId('avatar-user-1')).toHaveAttribute('data-user-color', '#173e2c');
    expect(screen.getByTestId('avatar-user-2')).toHaveStyle({ backgroundColor: '#166534' });
  });

  it('groups the overflow into a count with a tooltip description', () => {
    render(<AvatarGroup items={ITEMS} label="Participants" />);

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Participants' })).toBeInTheDocument();
    expect(screen.queryByTestId('avatar-user-5')).not.toBeInTheDocument();
  });

  it('keeps the description out of the avatar accessible name', () => {
    render(
      <AvatarGroup
        items={[{ id: 'user-1', name: 'Ada Lovelace', description: 'Ada Lovelace (user-1)' }]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('hides every avatar from assistive technology when decorative', () => {
    render(<AvatarGroup items={ITEMS} decorative />);

    expect(screen.queryByRole('img', { name: 'Ada Lovelace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders nothing when there are no items', () => {
    const { container } = render(<AvatarGroup items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
