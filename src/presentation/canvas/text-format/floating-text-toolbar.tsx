import {
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  List,
  ListOrdered,
  Paintbrush,
  Sparkles,
  Underline,
} from '@raulrod/icons';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ColorPicker } from './color-picker';
import type { FormatPainterState } from './format-painter-store';
import {
  armFormatPainter,
  buildFormatPainterActions,
  idleFormatPainter,
} from './format-painter-store';
import { FontFamilySelect } from './font-family-select';
import { FontSizeSelect } from './font-size-select';
import type { ToolbarDimensions } from './floating-position';
import { computeFloatingPosition } from './floating-position';
import { StylesMenu } from './styles-menu';
import type { TextFormatAction, TextFormatState } from './text-format';
import type { TextFormatTarget } from './text-format-target';
import { ToolbarButton, ToolbarDivider, ToolbarGroup } from './toolbar-primitives';
import type { TextSelectionSnapshot } from './use-text-selection';
import { readTextSelection, useTextSelection } from './use-text-selection';

const HIGHLIGHT_DEFAULT_COLOR = '#ffe119';
const FONT_COLOR_DEFAULT = '#000000';

const Toolbar = styled.div`
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  z-index: 30;
  user-select: none;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const StepLabel = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1;
`;

export interface FloatingTextToolbarProps {
  readonly scopeRef: React.RefObject<HTMLElement | null>;
  readonly formatTarget: TextFormatTarget | null;
  readonly enabled?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function FloatingTextToolbar({
  scopeRef,
  formatTarget,
  enabled = true,
  onOpenChange,
}: FloatingTextToolbarProps): ReactElement | null {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<TextSelectionSnapshot | null>(null);
  const [painter, setPainter] = useState<FormatPainterState>(idleFormatPainter);
  const [toolbarSize, setToolbarSize] = useState<ToolbarDimensions>({ width: 0, height: 0 });
  const [, setVersion] = useState(0);

  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const armedOriginRef = useRef<TextSelectionSnapshot | null>(null);
  const propsRef = useRef({ scopeRef, formatTarget, enabled, onOpenChange });
  propsRef.current = { scopeRef, formatTarget, enabled, onOpenChange };
  const painterRef = useRef(painter);
  painterRef.current = painter;

  const close = useCallback((): void => {
    setOpen(false);
    setAnchor(null);
    setPainter(idleFormatPainter());
    armedOriginRef.current = null;
    propsRef.current.onOpenChange?.(false);
  }, []);

  const bump = useCallback((): void => {
    setVersion((version) => version + 1);
  }, []);

  const applyAction = useCallback(
    (action: TextFormatAction): void => {
      const target = propsRef.current.formatTarget;

      if (target === null) {
        return;
      }

      target.applyAction(action);
      bump();
    },
    [bump],
  );

  function applyPainter(captured: TextFormatState): void {
    const target = propsRef.current.formatTarget;

    if (target === null) {
      return;
    }

    const current = target.getState();

    for (const action of buildFormatPainterActions(captured, current)) {
      target.applyAction(action);
    }

    setPainter(idleFormatPainter());
    armedOriginRef.current = null;
    bump();
  }

  function handleSelectionChange(next: TextSelectionSnapshot | null): void {
    if (next === null) {
      const active = document.activeElement;

      if (active !== null && toolbarRef.current?.contains(active) === true) {
        return;
      }

      close();
      return;
    }

    setAnchor(next);

    const state = painterRef.current;
    const origin = armedOriginRef.current;

    if (state.armed && state.captured !== null && origin !== null && !sameSelection(origin, next)) {
      applyPainter(state.captured);
    }
  }

  useTextSelection({
    active: open,
    scopeRef,
    onSelectionChange: handleSelectionChange,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const scope = scopeRef.current;

    if (scope === null) {
      return;
    }

    function handleContextMenu(event: MouseEvent): void {
      if (propsRef.current.formatTarget === null) {
        return;
      }

      const snapshot = readTextSelection(scope);

      if (snapshot === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setAnchor(snapshot);
      setOpen(true);
      armedOriginRef.current = null;
      propsRef.current.onOpenChange?.(true);
    }

    scope.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      scope.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [enabled, scopeRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleMouseDown(event: MouseEvent): void {
      const target = event.target;

      if (target instanceof Node && toolbarRef.current?.contains(target) === true) {
        return;
      }

      close();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        close();
      }
    }

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && formatTarget === null) {
      close();
    }
  }, [open, formatTarget, close]);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;

    if (!open || toolbar === null) {
      return;
    }

    const rect = toolbar.getBoundingClientRect();

    setToolbarSize((previous) =>
      previous.width === rect.width && previous.height === rect.height
        ? previous
        : { width: rect.width, height: rect.height },
    );
  }, [open, anchor, toolbarSize]);

  function togglePainter(): void {
    if (painter.armed) {
      setPainter(idleFormatPainter());
      armedOriginRef.current = null;
      return;
    }

    if (state === null) {
      return;
    }

    setPainter(armFormatPainter(state));
    armedOriginRef.current = anchor;
  }

  function handleToolbarMouseDown(event: ReactMouseEvent<HTMLDivElement>): void {
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.closest('input, textarea, [contenteditable="true"]') !== null
    ) {
      return;
    }

    event.preventDefault();
  }

  const state: TextFormatState | null =
    open && formatTarget !== null ? formatTarget.getState() : null;
  const listsEnabled = formatTarget?.capabilities.lists !== false;

  if (!open || state === null || anchor === null) {
    return null;
  }

  const position = computeFloatingPosition(anchor.rect, toolbarSize, {
    width: window.innerWidth,
    height: window.innerHeight,
  });

  function toggleButton(
    mark: 'bold' | 'italic' | 'underline',
    label: string,
    icon: ReactElement,
  ): ReactElement {
    const markState = state === null ? 'off' : state[mark];

    return (
      <ToolbarButton
        type="button"
        aria-label={label}
        aria-pressed={markState === 'on'}
        data-mixed={markState === 'mixed'}
        $active={markState === 'on'}
        $mixed={markState === 'mixed'}
        onClick={() => applyAction({ kind: 'toggleMark', mark })}
      >
        {icon}
      </ToolbarButton>
    );
  }

  return (
    <Toolbar
      ref={toolbarRef}
      role="toolbar"
      aria-label="Text formatting"
      data-testid="floating-text-toolbar"
      data-placement={position.placement}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleToolbarMouseDown}
    >
      <Row>
        <FontFamilySelect
          value={state.fontFamily}
          onSelect={(value) => applyAction({ kind: 'fontFamily', value })}
        />
        <ToolbarDivider />
        <FontSizeSelect
          value={state.fontSize}
          onSelect={(value) => applyAction({ kind: 'fontSize', value })}
        />
        <ToolbarButton
          type="button"
          aria-label="Increase font size"
          onClick={() => applyAction({ kind: 'increaseFontSize' })}
        >
          <StepLabel aria-hidden="true">A</StepLabel>
          <ChevronUp aria-hidden="true" size={10} />
        </ToolbarButton>
        <ToolbarButton
          type="button"
          aria-label="Decrease font size"
          onClick={() => applyAction({ kind: 'decreaseFontSize' })}
        >
          <StepLabel aria-hidden="true">A</StepLabel>
          <ChevronDown aria-hidden="true" size={10} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          type="button"
          aria-label="Format painter"
          aria-pressed={painter.armed}
          data-active={painter.armed}
          $active={painter.armed}
          onClick={togglePainter}
        >
          <Paintbrush aria-hidden="true" size={16} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton type="button" aria-label="Text effects" disabled>
          <Sparkles aria-hidden="true" size={16} />
        </ToolbarButton>
        <ToolbarDivider />
        <StylesMenu state={state} onAction={applyAction} />
      </Row>
      <Row>
        <ToolbarGroup>
          {toggleButton('bold', 'Bold', <Bold aria-hidden="true" size={16} />)}
          {toggleButton('italic', 'Italic', <Italic aria-hidden="true" size={16} />)}
          {toggleButton('underline', 'Underline', <Underline aria-hidden="true" size={16} />)}
        </ToolbarGroup>
        <ToolbarDivider />
        <ColorPicker
          label="Highlight color"
          color={state.highlightColor}
          defaultColor={HIGHLIGHT_DEFAULT_COLOR}
          onPick={(value) => applyAction({ kind: 'highlightColor', value })}
        />
        <ColorPicker
          label="Font color"
          color={state.color}
          defaultColor={FONT_COLOR_DEFAULT}
          onPick={(value) => applyAction({ kind: 'color', value })}
        />
        <ToolbarDivider />
        <ToolbarButton
          type="button"
          aria-label="Bulleted list"
          aria-pressed={state.bulletList === 'on'}
          data-mixed={state.bulletList === 'mixed'}
          $active={state.bulletList === 'on'}
          $mixed={state.bulletList === 'mixed'}
          disabled={!listsEnabled}
          onClick={() => applyAction({ kind: 'list', value: 'bulletList' })}
        >
          <List aria-hidden="true" size={16} />
        </ToolbarButton>
        <ToolbarButton
          type="button"
          aria-label="Numbered list"
          aria-pressed={state.orderedList === 'on'}
          data-mixed={state.orderedList === 'mixed'}
          $active={state.orderedList === 'on'}
          $mixed={state.orderedList === 'mixed'}
          disabled={!listsEnabled}
          onClick={() => applyAction({ kind: 'list', value: 'orderedList' })}
        >
          <ListOrdered aria-hidden="true" size={16} />
        </ToolbarButton>
      </Row>
    </Toolbar>
  );
}

function sameSelection(a: TextSelectionSnapshot, b: TextSelectionSnapshot): boolean {
  return (
    a.text === b.text &&
    a.rect.x === b.rect.x &&
    a.rect.y === b.rect.y &&
    a.rect.width === b.rect.width &&
    a.rect.height === b.rect.height
  );
}
