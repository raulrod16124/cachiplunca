import { Button, Heading } from '@raulrod/ui';
import { Plus } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';

export const BoardsMain = styled.main`
  position: relative;
  width: 100%;
  min-height: 100dvh;
  overflow-x: hidden;
  background: var(--stitch-bg);
  color: var(--stitch-text);
`;

export const DotGrid = styled.div.attrs({ className: 'stitch-dot-grid' })`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

export const BoardsContainer = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[6]};
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space[6]} ${theme.space[5]}`};

  @media (min-width: 1024px) {
    padding: ${({ theme }) => `${theme.space[8]} ${theme.space[8]}`};
  }

  @media (max-width: 900px) {
    padding: ${({ theme }) => `${theme.space[5]} ${theme.space[4]}`};
  }
`;

export const BoardsHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

export const BoardsTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
`;

export const BoardsTitle = styled(Heading)`
  margin: 0;
  color: var(--stitch-text);
  font-family: var(--stitch-font-body);
  font-size: calc(32px * var(--cach-font-scale));
  font-weight: ${({ theme }) => theme.font.weight.bold};
  letter-spacing: -0.015em;
  line-height: 1.25;

  @media (max-width: 700px) {
    font-size: calc(28px * var(--cach-font-scale));
  }
`;

export const BoardsSubtitle = styled.p`
  margin: 0;
  color: var(--stitch-text-muted);
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.5;
`;

export const PrimaryCta = styled(Button)`
  &&.rr-button.rr-button--primary {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space[1]};
    width: auto;
    height: 40px;
    padding: 0 ${({ theme }) => theme.space[4]};
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-primary);
    color: var(--stitch-on-primary);
    font-size: ${({ theme }) => theme.font.size['2xs']};
    font-weight: ${({ theme }) => theme.font.weight.bold};
    letter-spacing: 0.01em;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--stitch-primary) 24%, transparent);
  }

  &&.rr-button.rr-button--primary:hover {
    background: var(--stitch-primary-hover);
  }

  &&.rr-button.rr-button--primary:active {
    background: var(--stitch-primary-active);
    transform: scale(0.98);
  }

  svg {
    transition: transform 200ms ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }

    &:hover svg {
      transform: none;
    }
  }
`;

export const BoardsFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[3]};
  padding-top: ${({ theme }) => theme.space[4]};
  color: var(--stitch-footer-text);
  font-size: 11px;
  letter-spacing: 0.04em;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export interface CreateBoardCtaProps {
  readonly label: string;
  readonly onClick: () => void;
}

export function CreateBoardCta({ label, onClick }: CreateBoardCtaProps): ReactNode {
  return (
    <PrimaryCta type="button" variant="primary" onClick={onClick}>
      <Plus aria-hidden="true" size={20} />
      {label}
    </PrimaryCta>
  );
}

export const StitchPanel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: ${({ theme }) => theme.space[6]};
  border: 1px solid var(--stitch-border);
  border-radius: var(--stitch-radius-card);
  background: var(--stitch-surface);
  color: var(--stitch-text);
  box-shadow: var(--stitch-card-shadow);

  @media (max-width: 700px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

export const StitchSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  padding-top: ${({ theme }) => theme.space[5]};
  border-top: 1px solid var(--stitch-border-soft);

  &:first-of-type {
    padding-top: 0;
    border-top: none;
  }
`;

export const StitchSectionHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};

  & > svg {
    flex: none;
    margin-top: 2px;
    color: var(--stitch-text-muted);
  }
`;

export const StitchSectionIcon = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  border: 1px solid color-mix(in srgb, var(--stitch-secondary) 28%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--stitch-secondary) 12%, transparent);
  color: var(--stitch-secondary);
`;

export const StitchSectionTitle = styled(Heading)`
  && {
    margin: 0;
    color: var(--stitch-text);
    font-size: ${({ theme }) => theme.font.size.lg};
    line-height: ${({ theme }) => theme.font.leading.tight};
  }
`;
