import { DialogContent } from '@raulrod/ui';
import type { FormHTMLAttributes, HTMLAttributes, ReactElement, ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type ModalBodyVariant = 'scroll' | 'tabs' | 'none';

export const ModalContent = styled(DialogContent)`
  && {
    min-height: 0;
    overflow: hidden;
  }
`;

const Layout = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--rr-space-3);
  min-height: 0;
  min-width: 0;
`;

const Form = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const Header = styled.div`
  flex: none;
  min-width: 0;
`;

const Body = styled.div<{ $variant: ModalBodyVariant }>`
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;

  ${({ $variant }) =>
    $variant === 'scroll'
      ? css`
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        `
      : $variant === 'tabs'
        ? css`
            display: flex;
            flex-direction: column;
            overflow: hidden;

            & > [role='tablist'] {
              flex: none;
            }

            & > [role='tabpanel'] {
              flex: 1 1 auto;
              min-height: 0;
              overflow-y: auto;
              overscroll-behavior: contain;
              scrollbar-gutter: stable;
            }
          `
        : css`
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `}
`;

const Footer = styled.div`
  flex: none;
  min-width: 0;
  padding-top: var(--rr-space-3);
  border-top: 1px solid var(--rr-color-border-default);
`;

export interface ModalLayoutProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function ModalLayout({ children, className }: ModalLayoutProps): ReactElement {
  return (
    <Layout className={className} data-testid="modal-layout">
      {children}
    </Layout>
  );
}

export interface ModalFormProps extends FormHTMLAttributes<HTMLFormElement> {
  readonly children: ReactNode;
}

export function ModalForm({ children, ...props }: ModalFormProps): ReactElement {
  return <Form {...props}>{children}</Form>;
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function ModalHeader({ children, ...props }: ModalHeaderProps): ReactElement {
  return (
    <Header {...props} data-testid="modal-header">
      {children}
    </Header>
  );
}

export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly variant?: ModalBodyVariant;
}

export function ModalBody({
  children,
  variant = 'scroll',
  ...props
}: ModalBodyProps): ReactElement {
  return (
    <Body
      {...props}
      $variant={variant}
      data-variant={variant}
      data-testid="modal-body"
      tabIndex={variant === 'scroll' ? 0 : props.tabIndex}
    >
      {children}
    </Body>
  );
}

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function ModalFooter({ children, ...props }: ModalFooterProps): ReactElement {
  return (
    <Footer {...props} data-testid="modal-footer">
      {children}
    </Footer>
  );
}
