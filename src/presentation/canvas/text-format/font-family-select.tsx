import { Search } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { TextFontFamily } from '../../../domain/element';
import { FONT_FAMILY_OPTIONS, fontFamilyCss, fontFamilyLabel } from './font-families';
import { ToolbarDropdown } from './toolbar-dropdown';

const SearchField = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border.default};
  margin-bottom: 4px;
  color: ${({ theme }) => theme.canvas.hintText};
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const FontOption = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 8px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  }
`;

const EmptyState = styled.span`
  padding: 4px 8px;
  color: ${({ theme }) => theme.canvas.hintText};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export interface FontFamilySelectProps {
  readonly value: TextFontFamily | undefined;
  readonly onSelect: (family: TextFontFamily) => void;
}

export function FontFamilySelect({ value, onSelect }: FontFamilySelectProps): ReactElement {
  const [query, setQuery] = useState('');
  const label = value === undefined ? 'Default' : fontFamilyLabel(value);

  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (normalized.length === 0) {
      return FONT_FAMILY_OPTIONS;
    }

    return FONT_FAMILY_OPTIONS.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <ToolbarDropdown
      label="Font"
      triggerContent={
        <span style={{ fontFamily: value === undefined ? 'inherit' : fontFamilyCss(value) }}>
          {label}
        </span>
      }
    >
      <SearchField>
        <Search aria-hidden="true" size={14} />
        <SearchInput
          type="text"
          aria-label="Search fonts"
          placeholder="Search fonts"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </SearchField>
      {options.length === 0 ? (
        <EmptyState>No matching fonts</EmptyState>
      ) : (
        options.map((option) => (
          <FontOption
            key={option.value}
            type="button"
            role="option"
            aria-selected={value === option.value}
            style={{ fontFamily: option.css }}
            onClick={() => {
              onSelect(option.value);
              setQuery('');
            }}
          >
            {option.label}
          </FontOption>
        ))
      )}
    </ToolbarDropdown>
  );
}
