import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Text,
  VisuallyHidden,
} from '@raulrod/ui';
import { Search } from '@raulrod/icons';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styled, { css } from 'styled-components';
import { ModalBody, ModalContent, ModalHeader, ModalLayout } from '../modal-layout';
import { useI18n } from '../../i18n';
import { useCommandPaletteShortcut } from '../../hooks/use-command-palette-shortcut';
import {
  filterCommandPaletteGroups,
  firstEnabledCommandPaletteIndex,
  flattenCommandPaletteGroups,
  nextEnabledCommandPaletteIndex,
} from './command-palette-filter';
import type { CommandPaletteGroup } from './command-palette.types';

const PaletteContent = styled(ModalContent)<{ $surface: CommandPaletteSurface }>`
  && {
    gap: ${({ theme }) => theme.space[4]};
    max-width: 40rem;
    overflow: hidden;
    padding: ${({ theme }) => theme.space[5]};
    border: 1px solid ${({ theme }) => theme.color.border.default};
  }

  ${({ $surface }) =>
    $surface === 'stitch' &&
    css`
      && {
        border-color: var(--stitch-border);
        border-radius: 16px;
        background: var(--stitch-surface);
        color: var(--stitch-text);
        box-shadow: var(--stitch-card-shadow);
      }
    `}

  @media (max-width: 700px) {
    && {
      gap: ${({ theme }) => theme.space[3]};
      padding: ${({ theme }) => theme.space[4]};
    }
  }
`;

const Body = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  min-height: 0;
  min-width: 0;
`;

const SearchField = styled.div`
  position: relative;

  & > svg {
    position: absolute;
    top: 50%;
    left: ${({ theme }) => theme.space[4]};
    transform: translateY(-50%);
    color: ${({ theme }) => theme.color.text.muted};
    pointer-events: none;
  }
`;

const SearchInput = styled(Input)`
  padding-left: ${({ theme }) => theme.space[10]};
`;

const Results = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  max-height: min(360px, 50vh);
  min-height: 0;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space[1]};
  scrollbar-gutter: stable;
`;

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
`;

const GroupTitle = styled.h3`
  margin: 0;
  padding: 0 ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: ${({ theme }) => theme.font.tracking.wide};
  text-transform: uppercase;
`;

const OptionList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Option = styled.li<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  min-height: ${({ theme }) => theme.space[10]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.color.text.muted : theme.color.text.primary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition:
    background-color ${({ theme }) => theme.motion.duration.fast} ease,
    border-color ${({ theme }) => theme.motion.duration.fast} ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:not([aria-disabled='true']):hover {
    background: var(--cach-control-hover);
  }

  &[aria-selected='true'],
  &[aria-selected='true']:hover {
    border-color: ${({ theme }) => theme.color.border.primary};
    background: color-mix(
      in srgb,
      ${({ theme }) => theme.color.action.primary.background} 12%,
      transparent
    );
    box-shadow: inset 3px 0 0 ${({ theme }) => theme.color.border.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const OptionMain = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const OptionLabel = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: ${({ theme }) => theme.font.leading.tight};
  text-overflow: ellipsis;
  white-space: nowrap;

  ${Option}[aria-selected='true'] & {
    font-weight: ${({ theme }) => theme.font.weight.semibold};
  }
`;

const OptionDescription = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: ${({ theme }) => theme.font.leading.tight};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Shortcut = styled.kbd`
  flex: none;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-bottom-width: 2px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.mono};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  white-space: nowrap;
`;

const Empty = styled(Text)`
  padding: ${({ theme }) => `${theme.space[8]} ${theme.space[4]}`};
  text-align: center;
`;

const Hint = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  border-top: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
  padding-top: ${({ theme }) => theme.space[3]};
`;

export type CommandPaletteSurface = 'brand' | 'stitch';

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly groups: readonly CommandPaletteGroup[];
  readonly searchGroups?: (query: string) => readonly CommandPaletteGroup[];
  readonly statusMessage?: string | null;
  readonly surface?: CommandPaletteSurface;
}

export function CommandPalette({
  open,
  onOpenChange,
  groups,
  searchGroups,
  statusMessage = null,
  surface = 'brand',
}: CommandPaletteProps): ReactNode {
  const { t } = useI18n();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useCommandPaletteShortcut({ open, onOpenChange });

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setActiveIndex(-1);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  const visibleGroups = useMemo(() => {
    const dynamicGroups =
      query.trim().length === 0 || searchGroups === undefined ? [] : searchGroups(query);

    return filterCommandPaletteGroups([...groups, ...dynamicGroups], query);
  }, [groups, searchGroups, query]);

  const items = useMemo(() => flattenCommandPaletteGroups(visibleGroups), [visibleGroups]);
  const firstEnabledIndex = firstEnabledCommandPaletteIndex(items);
  const resolvedActiveIndex =
    activeIndex >= 0 && items[activeIndex] !== undefined && items[activeIndex].disabled !== true
      ? activeIndex
      : firstEnabledIndex;
  const activeItem = resolvedActiveIndex >= 0 ? items[resolvedActiveIndex] : undefined;
  const resultLabel =
    items.length === 1
      ? t('commandPalette.results.one')
      : t('commandPalette.results.other', { count: items.length });

  useEffect(() => {
    if (!open || resolvedActiveIndex < 0) {
      return;
    }

    const element = document.getElementById(`${listboxId}-option-${resolvedActiveIndex}`);
    element?.scrollIntoView?.({ block: 'nearest' });
  }, [listboxId, open, resolvedActiveIndex]);

  function selectItem(item: (typeof items)[number] | undefined): void {
    if (item === undefined || item.disabled === true) {
      return;
    }

    onOpenChange(false);
    item.onSelect();
  }

  function moveActive(direction: 1 | -1): void {
    setActiveIndex(nextEnabledCommandPaletteIndex(items, resolvedActiveIndex, direction));
  }

  function moveToEdge(edge: 'first' | 'last'): void {
    if (edge === 'first') {
      setActiveIndex(firstEnabledIndex);
      return;
    }

    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (items[index]?.disabled !== true) {
        setActiveIndex(index);
        return;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveToEdge('first');
        break;
      case 'End':
        event.preventDefault();
        moveToEdge('last');
        break;
      case 'Enter':
        event.preventDefault();
        selectItem(activeItem);
        break;
      default:
        break;
    }
  }

  let optionIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PaletteContent
        $surface={surface}
        {...(surface === 'stitch' ? { 'data-surface': 'stitch' } : {})}
      >
        <ModalLayout>
          <ModalHeader>
            <DialogHeader>
              <DialogTitle>{t('commandPalette.title')}</DialogTitle>
              <DialogDescription>{t('commandPalette.description')}</DialogDescription>
            </DialogHeader>
          </ModalHeader>
          <ModalBody variant="none">
            <Body>
              <SearchField>
                <Search aria-hidden="true" size={16} />
                <SearchInput
                  ref={inputRef}
                  type="text"
                  size="lg"
                  role="combobox"
                  aria-label={t('commandPalette.inputLabel')}
                  aria-autocomplete="list"
                  aria-expanded={open}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    activeItem === undefined
                      ? undefined
                      : `${listboxId}-option-${resolvedActiveIndex}`
                  }
                  placeholder={t('commandPalette.placeholder')}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  data-testid="command-palette-input"
                />
              </SearchField>
              <VisuallyHidden role="status" aria-live="polite">
                {resultLabel}
              </VisuallyHidden>
              {statusMessage === null || query.trim().length === 0 ? null : (
                <Text color="color.text.muted" size="font.size.sm" role="status">
                  {statusMessage}
                </Text>
              )}
              <Results id={listboxId} role="listbox" aria-label={t('commandPalette.resultsLabel')}>
                {items.length === 0 ? (
                  <Empty color="color.text.muted" size="font.size.sm">
                    {t('commandPalette.empty')}
                  </Empty>
                ) : (
                  visibleGroups.map((group) => {
                    const headingId = `${listboxId}-group-${group.id}`;

                    return (
                      <Group key={group.id} role="group" aria-labelledby={headingId}>
                        <GroupTitle id={headingId}>{group.label}</GroupTitle>
                        <OptionList role="none">
                          {group.items.map((item) => {
                            optionIndex += 1;
                            const index = optionIndex;
                            const active = index === resolvedActiveIndex;
                            const disabled = item.disabled === true;

                            return (
                              <Option
                                key={`${group.id}-${item.id}`}
                                id={`${listboxId}-option-${index}`}
                                role="option"
                                aria-selected={active}
                                aria-disabled={disabled ? true : undefined}
                                $disabled={disabled}
                                data-testid={`command-palette-item-${item.id}`}
                                onMouseMove={() => {
                                  if (!disabled) {
                                    setActiveIndex(index);
                                  }
                                }}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectItem(item)}
                              >
                                <OptionMain>
                                  <OptionLabel>{item.label}</OptionLabel>
                                  {item.description === undefined ? null : (
                                    <OptionDescription>{item.description}</OptionDescription>
                                  )}
                                </OptionMain>
                                {item.shortcut === undefined ? null : (
                                  <Shortcut>{item.shortcut}</Shortcut>
                                )}
                              </Option>
                            );
                          })}
                        </OptionList>
                      </Group>
                    );
                  })
                )}
              </Results>
              <Hint>
                <Text color="color.text.muted" size="font.size.xs">
                  {t('commandPalette.hint')}
                </Text>
              </Hint>
            </Body>
          </ModalBody>
        </ModalLayout>
      </PaletteContent>
    </Dialog>
  );
}
