import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { render, screen } from '../../../setup/render-with-theme';
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalLayout,
} from '../../../../presentation/components/modal-layout';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

function renderModal(content: ReactNode): void {
  render(
    <Dialog open onOpenChange={() => undefined}>
      <ModalContent>
        <ModalLayout>{content}</ModalLayout>
      </ModalContent>
    </Dialog>,
  );
}

describe('ModalLayout', () => {
  it('renders header, body and footer in order', () => {
    renderModal(
      <>
        <ModalHeader>
          <DialogHeader>
            <DialogTitle>Modal title</DialogTitle>
          </DialogHeader>
        </ModalHeader>
        <ModalBody>Body content</ModalBody>
        <ModalFooter>
          <DialogFooter>Footer actions</DialogFooter>
        </ModalFooter>
      </>,
    );

    const layout = screen.getByTestId('modal-layout');
    const children = [...layout.children].map((child) => child.getAttribute('data-testid'));

    expect(children).toEqual(['modal-header', 'modal-body', 'modal-footer']);
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('uses a scrollable body by default', () => {
    renderModal(<ModalBody>Scrollable body</ModalBody>);

    expect(screen.getByTestId('modal-body')).toHaveAttribute('data-variant', 'scroll');
    expect(screen.getByTestId('modal-body')).toHaveAttribute('tabindex', '0');
  });

  it('supports the tabs body variant', () => {
    renderModal(<ModalBody variant="tabs">Tabs body</ModalBody>);

    expect(screen.getByTestId('modal-body')).toHaveAttribute('data-variant', 'tabs');
    expect(screen.getByTestId('modal-body')).not.toHaveAttribute('tabindex');
  });

  it('omits the footer when it is not provided', () => {
    renderModal(
      <>
        <ModalHeader>
          <DialogHeader>
            <DialogTitle>Modal title</DialogTitle>
          </DialogHeader>
        </ModalHeader>
        <ModalBody>Body content</ModalBody>
      </>,
    );

    expect(screen.queryByTestId('modal-footer')).not.toBeInTheDocument();
  });

  it('defines a single scroll region with a pinned header and footer', () => {
    renderModal(
      <>
        <ModalHeader>Header</ModalHeader>
        <ModalBody>Body</ModalBody>
        <ModalFooter>Footer</ModalFooter>
      </>,
    );

    const css = styleText();
    expect(css).toContain('overflow-y:auto');
    expect(css).toContain('min-height:0');
    expect(css).toContain('flex:1 1 auto');
    expect(css).toContain('overscroll-behavior:contain');
    expect(css).toContain('var(--rr-space-3)');
    expect(css).toContain('var(--rr-color-border-default)');
  });
});
