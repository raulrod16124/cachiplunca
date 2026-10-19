import type { FileDownloadPort } from '../../application/ports';
import { createBrowserFileDownload } from '../../infrastructure/browser/browser-file-download';

export interface ExportServices {
  readonly fileDownload: FileDownloadPort;
}

export function createExportServices(): ExportServices {
  return {
    fileDownload: createBrowserFileDownload(),
  };
}
