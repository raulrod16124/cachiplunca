import { Check, ChevronDown, Minus } from '@raulrod/icons';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import { useI18n, type TranslationKey } from '../../i18n';
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

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
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
  readonly labelKey: TranslationKey;
  readonly previewStyle: CSSProperties;
  readonly disabled?: boolean;
  readonly action?: TextFormatAction;
  readonly isActive: (state: TextFormatState) => boolean;
  readonly isMixed?: (state: TextFormatState) => boolean;
}

const STYLE_DEFINITIONS: readonly StyleDefinition[] = [
  {
    id: 'normal',
    labelKey: 'canvas.textFormat.styleNormal',
    previewStyle: {},
    action: { kind: 'heading', level: null },
    isActive: (state) => state.heading === 'off',
    isMixed: (state) => state.heading === 'mixed',
  },
  {
    id: 'heading-1',
    labelKey: 'canvas.textFormat.styleHeading1',
    previewStyle: { fontSize: '1.5em', fontWeight: 700 },
    action: { kind: 'heading', level: 1 },
    isActive: (state) => state.heading === 1,
  },
  {
    id: 'heading-2',
    labelKey: 'canvas.textFormat.styleHeading2',
    previewStyle: { fontSize: '1.25em', fontWeight: 700 },
    action: { kind: 'heading', level: 2 },
    isActive: (state) => state.heading === 2,
  },
  {
    id: 'heading-3',
    labelKey: 'canvas.textFormat.styleHeading3',
    previewStyle: { fontSize: '1.1em', fontWeight: 700 },
    action: { kind: 'heading', level: 3 },
    isActive: (state) => state.heading === 3,
  },
  {
    id: 'subtitle',
    labelKey: 'canvas.textFormat.styleSubtitle',
    previewStyle: { fontSize: '1.17em', fontWeight: 500 },
    disabled: true,
    isActive: () => false,
  },
  {
    id: 'quote',
    labelKey: 'canvas.textFormat.styleQuote',
    previewStyle: { fontStyle: 'italic', paddingLeft: '0.75em' },
    disabled: true,
    isActive: () => false,
  },
  {
    id: 'emphasis',
    labelKey: 'canvas.textFormat.styleEmphasis',
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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <ToolbarDropdown
      label={t('canvas.textFormat.styles')}
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
          <StylePreview $previewStyle={style.previewStyle}>{t(style.labelKey)}</StylePreview>
          {indicator(style.isActive(state), style.isMixed?.(state) === true)}
        </StyleOption>
      ))}
    </ToolbarDropdown>
  );
}
