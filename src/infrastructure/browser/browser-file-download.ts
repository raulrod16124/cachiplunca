import type { FileDownloadPort, TextFileDownload } from '../../application/ports';

export function createBrowserFileDownload(): FileDownloadPort {
  return {
    downloadTextFile({ fileName, content, mimeType }: TextFileDownload): void {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  };
}
