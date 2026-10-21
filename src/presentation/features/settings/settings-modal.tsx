import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { SettingsControls } from './settings-controls';

export interface SettingsModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps): ReactNode {
  if (!open) {
    return null;
  }
  return <SettingsDialog onOpenChange={onOpenChange} />;
}

function SettingsDialog({
  onOpenChange,
}: {
  readonly onOpenChange: (open: boolean) => void;
}): ReactNode {
  const { t } = useI18n();

  return (
    <Dialog open onOpenChange={onOpenChange} classNames={{ content: 'settings-dialog-content' }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>
        <SettingsControls />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
