import { isImageFileLike } from './image-upload';

export interface ClipboardDataLike {
  readonly files: ArrayLike<File>;
  getData(format: string): string;
}

export type ClipboardPayload =
  | { readonly kind: 'image'; readonly file: File }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'empty' };

export function classifyClipboardPayload(dataTransfer: ClipboardDataLike | null): ClipboardPayload {
  if (dataTransfer === null) {
    return { kind: 'empty' };
  }

  const imageFile = Array.from(dataTransfer.files).find(isImageFileLike);

  if (imageFile !== undefined) {
    return { kind: 'image', file: imageFile };
  }

  const text = dataTransfer.getData('text/plain');

  if (text.trim().length > 0) {
    return { kind: 'text', text };
  }

  return { kind: 'empty' };
}
