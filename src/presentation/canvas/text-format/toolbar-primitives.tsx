import styled from 'styled-components';

export const ToolbarButton = styled.button<{ $active?: boolean; $mixed?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
  border: 1px solid
    ${({ theme, $active, $mixed }) =>
      $active === true || $mixed === true ? theme.color.focusRing : 'transparent'};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme, $active, $mixed }) =>
    $active === true || $mixed === true ? theme.canvas.surfaceMuted : 'transparent'};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    background-color: ${({ theme }) => theme.color.border.default};
  }

  &:disabled {
    color: ${({ theme }) => theme.canvas.hintText};
    cursor: default;
  }
`;

export const ToolbarGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`;

export const ToolbarDivider = styled.span.attrs({
  role: 'separator',
  'aria-orientation': 'vertical',
})`
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background-color: ${({ theme }) => theme.color.border.default};
  flex: none;
`;
