import { Injectable, NotFoundException } from '@nestjs/common';
import { DbStorageDriver } from './db-storage.driver';
import { GcsStorageDriver } from './gcs-storage.driver';
import { enforceAndResize, generateVariants } from './image-utils';
import { StorageDriver, StoredFile } from './storage-driver';

@Injectable()
export class FilesService {
  private driver: StorageDriver;

  constructor(db: DbStorageDriver, gcs: GcsStorageDriver) {
    const mode = (process.env.STORAGE_DRIVER || '').toLowerCase();
    if (mode === 'gcs') this.driver = gcs;
    else this.driver = db; // default
  }

  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile> {
    // Enforce max dimensions for images (e.g., 2400x2400)
    const MAX_W = parseInt(process.env.IMG_MAX_WIDTH || '2400', 10);
    const MAX_H = parseInt(process.env.IMG_MAX_HEIGHT || '2400', 10);
    const processed = await enforceAndResize(buffer, mimeType, MAX_W, MAX_H);
    const baseStored = await this.driver.store({ buffer: processed.buffer, filename, mimeType: processed.mimeType });
    // Generate variants only in DB driver mode for now
    if (this.driver instanceof DbStorageDriver && /^image\//.test(mimeType)) {
      const targets = (process.env.IMG_VARIANTS || '400,800,1200').split(',').map(s=>parseInt(s.trim(),10)).filter(n=>n>0);
      try {
        const variants = await generateVariants(processed.buffer, mimeType, targets);
        const prisma = (this.driver as any).prisma as import('../prisma/prisma.service').PrismaService;
        for (const v of variants) {
          await prisma.fileAsset.create({ data: { filename: `${v.key}_${filename}`, mimeType: v.mimeType, size: v.size, checksum: null, data: v.buffer, width: v.width, height: v.height, originalId: baseStored.id } });
        }
      } catch (_) {
        // swallow variant generation errors
      }
    }
    return baseStored;
  }

  async fetch(id: string) {
    const file = await this.driver.get(id);
    if (!file) throw new NotFoundException('File not found');
    return file;
  }
}
