import { Button, Heading, Text } from '@raulrod/ui';
import styled from 'styled-components';

/**
 * Stitch-form treatment shared by the auth forms.
 *
 * The Stitch surface already remaps `--rr-*` inside the tree, but the design
 * asks for filled fields without resting borders, a green secondary submit and
 * a compact, bold heading. Those are auth-scoped compositions, so they live
 * here instead of leaking into the shared Stitch layer used by the boards.
 */
export const AuthFormRoot = styled.div`
  --auth-field-background: color-mix(in srgb, var(--stitch-text) 4%, var(--stitch-surface));
  --auth-field-hover: color-mix(in srgb, var(--stitch-text) 7%, var(--stitch-surface));

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
  width: 100%;
  min-width: 0;

  form {
    width: 100%;
  }

  .rr-form-field-label {
    color: var(--stitch-text);
    font-family: var(--stitch-font-body);
    font-size: var(--rr-font-size-xs);
    font-weight: ${({ theme }) => theme.font.weight.semibold};
    letter-spacing: 0.01em;
  }

  .rr-form-field-description {
    color: var(--stitch-text-muted);
  }

  .rr-input {
    min-height: 46px;
    padding: var(--rr-space-3) var(--rr-space-4);
    border-color: transparent;
    border-radius: var(--stitch-radius-control);
    background: var(--auth-field-background);
    color: var(--stitch-text);
    font-family: var(--stitch-font-body);
    font-size: var(--rr-font-size-base);
  }

  .rr-input::placeholder {
    color: var(--stitch-text-subtle);
  }

  .rr-input:hover:not(:focus) {
    background: var(--auth-field-hover);
  }

  .rr-input:focus,
  .rr-input:focus-visible {
    background: var(--stitch-surface);
  }

  .rr-input[aria-invalid='true'] {
    border-color: var(--rr-color-border-danger);
  }

  .rr-checkbox {
    width: 20px;
    height: 20px;
    border-color: transparent;
    border-radius: 6px;
    background-color: var(--stitch-surface-high);
    box-shadow: var(--rr-shadow-sm);
  }

  .rr-checkbox:hover {
    background-color: var(--stitch-surface-high);
  }

  .rr-checkbox:checked,
  .rr-checkbox:indeterminate {
    border-color: transparent;
    background-image: none;
    background-color: var(--stitch-secondary);
  }

  .rr-checkbox:checked:not(:indeterminate):hover,
  .rr-checkbox:indeterminate:hover {
    border-color: transparent;
    background-color: var(--stitch-secondary-hover);
  }

  .rr-form-field-error {
    color: var(--rr-color-text-danger);
  }
`;

export const AuthTitle = styled(Heading)`
  margin: 0;
  color: var(--stitch-text);
  font-family: var(--stitch-font-body);
  font-size: var(--rr-font-size-2xl);
  font-weight: ${({ theme }) => theme.font.weight.bold};
  line-height: ${({ theme }) => theme.font.leading.tight};
  letter-spacing: -0.015em;
`;

export const AuthSubtitle = styled(Text)`
  color: var(--stitch-text-muted);
  font-size: var(--rr-font-size-base);
  line-height: ${({ theme }) => theme.font.leading.normal};
`;

export const AuthSubmit = styled(Button)`
  width: 100%;
  margin-top: ${({ theme }) => theme.space[1]};
  padding: var(--rr-space-3) var(--rr-space-6);
  border-color: transparent;
  border-radius: var(--stitch-radius-control);
  background: var(--stitch-secondary);
  color: var(--stitch-on-primary);
  font-family: var(--stitch-font-body);
  font-size: var(--rr-font-size-base);
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--stitch-secondary) 28%, transparent);

  &:hover:not(:disabled) {
    background: var(--stitch-secondary-hover);
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }
`;

export const AuthSwitchText = styled(Text)`
  color: var(--stitch-text-muted);
  font-size: var(--rr-font-size-base);
`;

export const AuthSwitchButton = styled(Button)`
  padding: 0;
  color: var(--stitch-primary);
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;

  &:hover {
    color: var(--stitch-primary-hover);
  }
`;
