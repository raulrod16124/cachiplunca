import { useEffect, useState } from 'react';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useSpacePressed(): boolean {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setPressed(true);
    }

    function handleKeyUp(event: KeyboardEvent): void {
      if (event.code !== 'Space') {
        return;
      }

      setPressed(false);
    }

    function handleBlur(): void {
      setPressed(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return pressed;
}
