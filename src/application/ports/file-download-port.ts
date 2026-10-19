export interface TextFileDownload {
  readonly fileName: string;
  readonly content: string;
  readonly mimeType: string;
}

export interface FileDownloadPort {
  downloadTextFile(file: TextFileDownload): void;
}
