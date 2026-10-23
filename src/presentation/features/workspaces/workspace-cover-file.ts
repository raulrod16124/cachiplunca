export function readFileBytes(file: File): Promise<ArrayBuffer | null> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().catch(() => null);
  }

  if (typeof FileReader === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise<ArrayBuffer | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result instanceof ArrayBuffer ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

export function readFileAsDataUrl(file: File): Promise<string | null> {
  if (typeof FileReader === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
