export interface StoredFile {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface StorageDriver {
  store(params: { buffer: Buffer; filename: string; mimeType: string }): Promise<StoredFile>;
  get(id: string): Promise<{ buffer: Buffer; filename: string; mimeType: string; size: number } | null>;
}
