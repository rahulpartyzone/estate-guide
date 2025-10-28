import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private storage: Storage | null = null;
  private publicBucket = process.env.GCS_PUBLIC_BUCKET || '';
  private privateBucket = process.env.GCS_PRIVATE_BUCKET || '';
  private localMode = false;

  constructor() {
    // Determine if we should run in local fallback mode
    if (!this.publicBucket || process.env.GCS_DISABLE === 'true') {
      this.localMode = true;
      this.logger.warn('GCS Service running in LOCAL FALLBACK mode (no bucket configured).');
    } else {
      try {
        this.storage = new Storage();
      } catch (e) {
        this.localMode = true;
        this.logger.error('Failed to initialize GCS Storage, switching to local fallback.', e as any);
      }
    }
  }

  async signPublicUpload(objectPath: string, contentType: string) {
    if (this.localMode || !this.storage) {
      // Fake presign: client can PUT directly nowhere; skip upload, treat as immediate
      const publicUrl = `/uploads/${objectPath}`; // could point to a future local folder
      return { uploadUrl: publicUrl, publicUrl, local: true };
    }
    const [url] = await this.storage
      .bucket(this.publicBucket)
      .file(objectPath)
      .getSignedUrl({ action: 'write', expires: Date.now() + 10 * 60 * 1000, contentType });
    const publicUrl = `https://storage.googleapis.com/${this.publicBucket}/${objectPath}`;
    return { uploadUrl: url, publicUrl };
  }

  async signPrivateUpload(objectPath: string, contentType: string) {
    if (this.localMode || !this.storage) {
      const pseudo = `private://${objectPath}`;
      return { uploadUrl: pseudo, publicUrl: pseudo, local: true };
    }
    const [url] = await this.storage
      .bucket(this.privateBucket)
      .file(objectPath)
      .getSignedUrl({ action: 'write', expires: Date.now() + 10 * 60 * 1000, contentType });
    const gsUrl = `gs://${this.privateBucket}/${objectPath}`;
    return { uploadUrl: url, publicUrl: gsUrl };
  }

  async signPrivateDownload(objectPath: string, ttlSeconds = 300) {
    if (this.localMode || !this.storage) {
      return `/download-not-configured?file=${encodeURIComponent(objectPath)}`;
    }
    const [url] = await this.storage
      .bucket(this.privateBucket)
      .file(objectPath)
      .getSignedUrl({ action: 'read', expires: Date.now() + ttlSeconds * 1000 });
    return url;
  }
}
