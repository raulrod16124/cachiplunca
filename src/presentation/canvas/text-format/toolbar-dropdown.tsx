import type { ReactElement, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { ToolbarButton } from './toolbar-primitives';

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 160px;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  z-index: 20;
`;

export interface ToolbarDropdownProps {
  readonly label: string;
  readonly triggerContent: ReactNode;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function ToolbarDropdown({
  label,
  triggerContent,
  children,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
}: ToolbarDropdownProps): ReactElement {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleMouseDown(event: MouseEvent): void {
      const target = event.target;

      if (target instanceof Node && wrapperRef.current?.contains(target) === true) {
        return;
      }

      changeOpen(false);
    }

    document.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [open]);

  function changeOpen(next: boolean): void {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChangeRef.current?.(next);
  }

  return (
    <Wrapper ref={wrapperRef}>
      <ToolbarButton
        type="button"
        ref={triggerRef}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        data-testid={`toolbar-trigger-${label}`}
        onClick={() => changeOpen(!open)}
      >
        {triggerContent}
      </ToolbarButton>
      {open ? (
        <Panel
          id={panelId}
          role="listbox"
          aria-label={label}
          data-testid={`toolbar-panel-${label}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              changeOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {children}
        </Panel>
      ) : null}
    </Wrapper>
  );
}
