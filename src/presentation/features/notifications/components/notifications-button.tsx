import { useState, type ReactNode } from 'react';
import { NotificationsDialog } from './notifications-dialog';

export function NotificationsButton(): ReactNode {
  const [open, setOpen] = useState(false);

  return <NotificationsDialog open={open} onOpenChange={setOpen} />;
}
