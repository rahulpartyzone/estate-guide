import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { StorageDriver, StoredFile } from './storage-driver';

@Injectable()
export class DbStorageDriver implements StorageDriver {
  constructor(private prisma: PrismaService) {}

  async store(params: { buffer: Buffer; filename: string; mimeType: string }): Promise<StoredFile> {
    const checksum = createHash('sha256').update(params.buffer).digest('hex');
    // Try reuse existing identical object
    const existing = await this.prisma.fileAsset.findFirst({ where: { checksum, size: params.buffer.length } });
    if (existing) {
      return { id: existing.id, url: `/api/v1/files/${existing.id}`, filename: existing.filename, mimeType: existing.mimeType, size: existing.size };
    }
    const rec = await this.prisma.fileAsset.create({ data: { filename: params.filename, mimeType: params.mimeType, size: params.buffer.length, checksum, data: params.buffer } });
    return {
      id: rec.id,
      url: `/api/v1/files/${rec.id}`,
      filename: rec.filename,
      mimeType: rec.mimeType,
      size: rec.size,
    };
  }

  async get(id: string) {
    const rec = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!rec) return null;
    return { buffer: Buffer.from(rec.data as any), filename: rec.filename, mimeType: rec.mimeType, size: rec.size };
  }
}
