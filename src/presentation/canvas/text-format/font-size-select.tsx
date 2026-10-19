import type { ReactElement } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import { TEXT_FONT_SIZES } from '../../../domain/element';
import type { TextFontSize } from '../../../domain/element';

const SizeInput = styled.input`
  width: 48px;
  height: 28px;
  padding: 0 4px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: transparent;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  text-align: center;

  &:hover {
    background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  }
`;

export interface FontSizeSelectProps {
  readonly value: TextFontSize | undefined;
  readonly onSelect: (size: TextFontSize) => void;
}

export function FontSizeSelect({ value, onSelect }: FontSizeSelectProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value === undefined ? '' : String(value));

  function commit(): void {
    if (draft === null) {
      return;
    }

    const parsed = Math.round(Number.parseFloat(draft));
    const valid = (TEXT_FONT_SIZES as readonly number[]).includes(parsed);

    if (valid) {
      onSelect(parsed as TextFontSize);
    }

    setDraft(null);
  }

  return (
    <SizeInput
      type="text"
      inputMode="numeric"
      aria-label="Font size"
      placeholder="Size"
      value={display}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          return;
        }

        if (event.key === 'Escape') {
          event.stopPropagation();
          setDraft(null);
        }
      }}
    />
  );
}
