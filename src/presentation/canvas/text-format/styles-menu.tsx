import { Check, ChevronDown, Minus } from '@raulrod/icons';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import type { TextFormatAction, TextFormatState } from './text-format';
import { ToolbarDropdown } from './toolbar-dropdown';

const StyleOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  }

  &:disabled {
    color: ${({ theme }) => theme.canvas.hintText};
    cursor: default;
  }
`;

const StylePreview = styled.span<{ $previewStyle: CSSProperties }>`
  ${({ $previewStyle }) => {
    const custom = $previewStyle as Record<string, string | number | undefined>;
    return Object.entries(custom)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${kebab(key)}: ${String(value)}`)
      .join('; ');
  }};
`;

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function indicator(active: boolean, mixed: boolean): ReactNode {
  if (active) {
    return <Check aria-hidden="true" size={14} />;
  }
  if (mixed) {
    return <Minus aria-hidden="true" size={14} />;
  }
  return <span style={{ width: 14 }} aria-hidden="true" />;
}

interface StyleDefinition {
  readonly id: string;
  readonly label: string;
  readonly previewStyle: CSSProperties;
  readonly disabled?: boolean;
  readonly action?: TextFormatAction;
  readonly isActive: (state: TextFormatState) => boolean;
  readonly isMixed?: (state: TextFormatState) => boolean;
}

const STYLE_DEFINITIONS: readonly StyleDefinition[] = [
  {
    id: 'normal',
    label: 'Normal',
    previewStyle: {},
    action: { kind: 'heading', level: null },
    isActive: (state) => state.heading === 'off',
    isMixed: (state) => state.heading === 'mixed',
  },
  {
    id: 'heading-1',
    label: 'Heading 1',
    previewStyle: { fontSize: '1.5em', fontWeight: 700 },
    action: { kind: 'heading', level: 1 },
    isActive: (state) => state.heading === 1,
  },
  {
    id: 'heading-2',
    label: 'Heading 2',
    previewStyle: { fontSize: '1.25em', fontWeight: 700 },
    action: { kind: 'heading', level: 2 },
    isActive: (state) => state.heading === 2,
  },
  {
    id: 'heading-3',
    label: 'Heading 3',
    previewStyle: { fontSize: '1.1em', fontWeight: 700 },
    action: { kind: 'heading', level: 3 },
    isActive: (state) => state.heading === 3,
  },
  {
    id: 'subtitle',
    label: 'Subtitle',
    previewStyle: { fontSize: '1.17em', fontWeight: 500 },
    disabled: true,
    isActive: () => false,
  },
  {
    id: 'quote',
    label: 'Quote',
    previewStyle: { fontStyle: 'italic', paddingLeft: '0.75em' },
    disabled: true,
    isActive: () => false,
  },
  {
    id: 'emphasis',
    label: 'Emphasis',
    previewStyle: { fontStyle: 'italic' },
    action: { kind: 'toggleMark', mark: 'italic' },
    isActive: (state) => state.italic === 'on',
    isMixed: (state) => state.italic === 'mixed',
  },
];

export interface StylesMenuProps {
  readonly state: TextFormatState;
  readonly onAction: (action: TextFormatAction) => void;
}

export function StylesMenu({ state, onAction }: StylesMenuProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <ToolbarDropdown
      label="Styles"
      open={open}
      onOpenChange={setOpen}
      triggerContent={
        <>
          <span aria-hidden="true">Aa</span>
          <ChevronDown aria-hidden="true" size={12} />
        </>
      }
    >
      {STYLE_DEFINITIONS.map((style) => (
        <StyleOption
          key={style.id}
          type="button"
          role="option"
          aria-selected={style.isActive(state)}
          disabled={style.disabled === true}
          data-style-id={style.id}
          onClick={() => {
            if (style.action !== undefined) {
              onAction(style.action);
            }
            setOpen(false);
          }}
        >
          <StylePreview $previewStyle={style.previewStyle}>{style.label}</StylePreview>
          {indicator(style.isActive(state), style.isMixed?.(state) === true)}
        </StyleOption>
      ))}
    </ToolbarDropdown>
  );
}
