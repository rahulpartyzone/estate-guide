import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { StorageDriver, StoredFile } from './storage-driver';
import { randomUUID } from 'crypto';

@Injectable()
export class GcsStorageDriver implements StorageDriver {
  private storage: Storage | null = null;
  private publicBucket = process.env.GCS_PUBLIC_BUCKET || '';

  constructor() {
    if (this.publicBucket) {
      try { this.storage = new Storage(); } catch { this.storage = null; }
    }
  }

  async store(params: { buffer: Buffer; filename: string; mimeType: string }): Promise<StoredFile> {
    if (!this.storage || !this.publicBucket) throw new InternalServerErrorException('GCS not configured');
    const id = randomUUID();
    const objectPath = `uploads/${id}/${params.filename}`;
    const file = this.storage.bucket(this.publicBucket).file(objectPath);
    await file.save(params.buffer, { contentType: params.mimeType, resumable: false, public: true });
    const publicUrl = `https://storage.googleapis.com/${this.publicBucket}/${objectPath}`;
    return { id, url: publicUrl, filename: params.filename, mimeType: params.mimeType, size: params.buffer.length };
  }

  async get(id: string) {
    // We cannot reliably map id back to object without storing mapping; GCS driver is meant for write-through only (no read via /files)
    return null;
  }
}
