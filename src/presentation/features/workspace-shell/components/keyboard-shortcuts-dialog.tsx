import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Heading,
  Stack,
  Text,
} from '@raulrod/ui';
import { useEffect, type ReactNode } from 'react';
import styled from 'styled-components';
import { SHORTCUT_GROUPS } from '../../../canvas/keyboard-shortcuts';
import { useI18n } from '../../../i18n';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const ShortcutList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ShortcutRow = styled.li`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  min-width: 0;
`;

const ShortcutLabel = styled(Text)`
  min-width: 0;
`;

const ShortcutKeys = styled.kbd`
  flex: none;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-bottom-width: 2px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.mono};
  font-size: ${({ theme }) => theme.font.size.xs};
  white-space: nowrap;
`;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

function hasOpenModal(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export interface KeyboardShortcutsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps): ReactNode {
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.key !== '?' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event.target) ||
        hasOpenModal()
      ) {
        return;
      }

      event.preventDefault();
      onOpenChange(true);
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
        </DialogHeader>
        <Stack gap="space-5">
          {SHORTCUT_GROUPS.map((group) => {
            const headingId = `shortcuts-group-${group.id}`;

            return (
              <Group key={group.id} aria-labelledby={headingId} data-testid={headingId}>
                <Heading as="h3" id={headingId}>
                  {t(group.titleKey)}
                </Heading>
                <ShortcutList>
                  {group.entries.map((entry) => (
                    <ShortcutRow key={entry.id}>
                      <ShortcutLabel color="color.text.primary" size="font.size.sm">
                        {t(entry.labelKey)}
                      </ShortcutLabel>
                      <ShortcutKeys>{t(entry.keysKey)}</ShortcutKeys>
                    </ShortcutRow>
                  ))}
                </ShortcutList>
              </Group>
            );
          })}
        </Stack>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
