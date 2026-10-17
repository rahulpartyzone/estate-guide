import { Injectable, Logger } from '@nestjs/common';
import { presignUrl, uriEncode } from './sigv4';

/**
 * Cloudflare R2 (S3-compatible) object storage.
 *
 * Env:
 *   R2_ACCOUNT_ID         Cloudflare account id (or set R2_ENDPOINT to the full S3 endpoint instead)
 *   R2_ACCESS_KEY_ID      R2 API token access key
 *   R2_SECRET_ACCESS_KEY  R2 API token secret
 *   R2_BUCKET             bucket name
 *   R2_PUBLIC_URL         public base URL of the bucket (custom domain or r2.dev URL), no trailing slash
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly endpoint =
    process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  private readonly bucket = process.env.R2_BUCKET || '';
  private readonly accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  private readonly secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  private readonly publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

  constructor() {
    if (!this.isConfigured()) {
      this.logger.warn('R2 is not configured; uploaded files will be stored in the database.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint && this.bucket && this.accessKeyId && this.secretAccessKey && this.publicBase);
  }

  private sign(method: 'GET' | 'PUT' | 'HEAD' | 'DELETE', key: string, expiresSeconds: number) {
    return presignUrl({
      method,
      endpoint: this.endpoint,
      path: `/${this.bucket}/${key}`,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: 'auto',
      expiresSeconds,
    });
  }

  /** URL the browser PUTs the file to (direct upload, bypasses the 4.5 MB function body limit). */
  presignUpload(key: string, expiresSeconds = 900) {
    return this.sign('PUT', key, expiresSeconds);
  }

  publicUrl(key: string) {
    return `${this.publicBase}/${uriEncode(key, true)}`;
  }

  async getObject(key: string): Promise<Buffer | null> {
    const res = await fetch(this.sign('GET', key, 300));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 GET ${key} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    const res = await fetch(this.sign('PUT', key, 300), {
      method: 'PUT',
      body: new Uint8Array(body),
      headers: { 'Content-Type': contentType },
    });
    if (!res.ok) throw new Error(`R2 PUT ${key} failed: ${res.status} ${await res.text().catch(() => '')}`);
  }

  async deleteObject(key: string) {
    const res = await fetch(this.sign('DELETE', key, 300), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${key} failed: ${res.status}`);
  }
}
