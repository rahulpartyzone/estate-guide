import { BadRequestException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { DbStorageDriver } from './db-storage.driver';
import { enforceAndResize } from './image-utils';
import { StoredFile } from './storage-driver';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024;
const UPLOAD_KEY_RE = /^uploads\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;

function safeFilename(name: string) {
  const cleaned = (name || 'file').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return (cleaned || 'file').slice(-120);
}

function assertAllowedType(mimeType: string) {
  if (!ALLOWED_MIME.includes(mimeType)) throw new BadRequestException('Unsupported file type');
}

// Light content sniffing so a renamed file can't masquerade as an image or PDF.
function assertSignature(buf: Buffer, mimeType: string) {
  const hex = (n: number) => buf.subarray(0, n).toString('hex');
  if (mimeType === 'image/jpeg' && hex(2) !== 'ffd8') throw new BadRequestException('JPEG signature mismatch');
  if (mimeType === 'image/png' && hex(8) !== '89504e470d0a1a0a') throw new BadRequestException('PNG signature mismatch');
  if (mimeType === 'application/pdf' && buf.subarray(0, 4).toString() !== '%PDF') throw new BadRequestException('PDF signature mismatch');
  if (mimeType === 'image/gif' && buf.subarray(0, 3).toString() !== 'GIF') throw new BadRequestException('GIF signature mismatch');
  if (mimeType === 'image/webp' && buf.subarray(8, 12).toString() !== 'WEBP') throw new BadRequestException('WEBP signature mismatch');
}

@Injectable()
export class FilesService {
  private readonly maxW = parseInt(process.env.IMG_MAX_WIDTH || '2400', 10);
  private readonly maxH = parseInt(process.env.IMG_MAX_HEIGHT || '2400', 10);

  constructor(
    private readonly prisma: PrismaService,
    private readonly db: DbStorageDriver,
    private readonly r2: R2Service,
  ) {}

  /** Step 1 of a direct upload: a presigned URL the browser PUTs the file to. */
  createUploadUrl(filename: string, mimeType: string, size: number) {
    if (!this.r2.isConfigured()) {
      // The frontend falls back to the multipart POST /files upload when it sees 501.
      throw new NotImplementedException('Direct uploads need object storage (R2) to be configured');
    }
    assertAllowedType(mimeType);
    if (size > MAX_UPLOAD_BYTES) throw new BadRequestException(`File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
    const key = `uploads/${randomUUID()}/${safeFilename(filename)}`;
    return {
      key,
      uploadUrl: this.r2.presignUpload(key),
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
    };
  }

  /** Step 2 of a direct upload: validate the object, shrink oversized images, and record it. */
  async completeUpload(key: string, filename: string, mimeType: string): Promise<StoredFile> {
    if (!this.r2.isConfigured()) throw new NotImplementedException('Object storage is not configured');
    if (!UPLOAD_KEY_RE.test(key)) throw new BadRequestException('Invalid upload key');
    assertAllowedType(mimeType);

    const existing = await this.prisma.fileAsset.findFirst({ where: { storageKey: key }, select: { id: true, url: true, filename: true, mimeType: true, size: true } });
    if (existing) return { id: existing.id, url: existing.url || '', filename: existing.filename, mimeType: existing.mimeType, size: existing.size };

    const original = await this.r2.getObject(key);
    if (!original) throw new BadRequestException('Uploaded file not found; upload it again');
    try {
      if (original.length > MAX_UPLOAD_BYTES) throw new BadRequestException('File too large');
      assertSignature(original, mimeType);
    } catch (e) {
      await this.r2.deleteObject(key).catch(() => undefined);
      throw e;
    }

    const processed = await enforceAndResize(original, mimeType, this.maxW, this.maxH);
    if (processed.buffer !== original) {
      await this.r2.putObject(key, processed.buffer, processed.mimeType);
    }
    return this.record(key, filename, processed.mimeType, processed.buffer, processed.width, processed.height);
  }

  /** Server-side upload (multipart POST /files). Used for local dev, or small files when R2 is configured. */
  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile> {
    assertAllowedType(mimeType);
    assertSignature(buffer, mimeType);
    const processed = await enforceAndResize(buffer, mimeType, this.maxW, this.maxH);
    if (!this.r2.isConfigured()) {
      return this.db.store({ buffer: processed.buffer, filename, mimeType: processed.mimeType });
    }
    const key = `uploads/${randomUUID()}/${safeFilename(filename)}`;
    await this.r2.putObject(key, processed.buffer, processed.mimeType);
    return this.record(key, filename, processed.mimeType, processed.buffer, processed.width, processed.height);
  }

  private async record(key: string, filename: string, mimeType: string, buffer: Buffer, width: number, height: number): Promise<StoredFile> {
    const url = this.r2.publicUrl(key);
    const rec = await this.prisma.fileAsset.create({
      data: {
        filename,
        mimeType,
        size: buffer.length,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        storageKey: key,
        url,
        width: width || null,
        height: height || null,
      },
    });
    return { id: rec.id, url, filename: rec.filename, mimeType: rec.mimeType, size: rec.size };
  }

  /**
   * Resolve /api/v1/files/:id. Files in object storage are answered with a redirect to their public URL,
   * so existing links in the database keep working after files move to R2.
   */
  async resolve(id: string): Promise<{ redirectUrl: string } | { buffer: Buffer; mimeType: string; size: number }> {
    const rec = await this.prisma.fileAsset.findUnique({ where: { id }, select: { url: true } }).catch(() => null);
    if (!rec) throw new NotFoundException('File not found');
    if (rec.url) return { redirectUrl: rec.url };
    const file = await this.db.get(id);
    if (!file) throw new NotFoundException('File not found');
    return { buffer: file.buffer, mimeType: file.mimeType, size: file.size };
  }
}
