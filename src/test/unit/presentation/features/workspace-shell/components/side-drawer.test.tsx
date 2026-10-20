import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../../setup/render-with-theme';
import { SideDrawer } from '../../../../../../presentation/features/workspace-shell/components/side-drawer';

describe('SideDrawer', () => {
  it('renders children as a modal dialog labelled by the drawer name', () => {
    render(
      <SideDrawer open label="Task plan" onClose={jest.fn()}>
        <p>Drawer content</p>
      </SideDrawer>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Task plan' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('Drawer content');
  });

  it('requests close on Escape', async () => {
    const onClose = jest.fn();
    render(
      <SideDrawer open label="Comments" onClose={onClose}>
        <p>Drawer content</p>
      </SideDrawer>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requests close on backdrop pointer down', async () => {
    const onClose = jest.fn();
    render(
      <SideDrawer open label="Comments" onClose={onClose}>
        <p>Drawer content</p>
      </SideDrawer>,
    );

    const backdrop = document.querySelector('.rr-dialog-backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.pointerDown(backdrop as Element);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('renders nothing while closed', () => {
    render(
      <SideDrawer open={false} label="Task plan" onClose={jest.fn()}>
        <p>Drawer content</p>
      </SideDrawer>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
