export class TestDragEvent extends MouseEvent {
  readonly dataTransfer: DataTransfer | null;

  constructor(type: string, init: DragEventInit = {}) {
    super(type, init);
    this.dataTransfer = init.dataTransfer ?? null;
  }
}

export function installDragEventPolyfill(): void {
  if (typeof globalThis.DragEvent === 'undefined') {
    Object.defineProperty(globalThis, 'DragEvent', {
      value: TestDragEvent,
      configurable: true,
    });
  }
}
