import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  size: number;
}

export async function enforceAndResize(buffer: Buffer, mimeType: string, maxWidth: number, maxHeight: number): Promise<ProcessedImage> {
  if (!/^image\//.test(mimeType)) {
    return { buffer, width: 0, height: 0, mimeType, size: buffer.length };
  }
  const img = sharp(buffer, { failOnError: true });
  const meta = await img.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width === 0 || height === 0) {
    return { buffer, width, height, mimeType, size: buffer.length };
  }
  if (width <= maxWidth && height <= maxHeight) {
    return { buffer, width, height, mimeType, size: buffer.length };
  }
  const resized = await img.resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true }).toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  return { buffer: resized, width: resizedMeta.width || width, height: resizedMeta.height || height, mimeType, size: resized.length };
}

export async function generateVariants(buffer: Buffer, mimeType: string, targetWidths: number[]): Promise<{ key: string; buffer: Buffer; width: number; height: number; mimeType: string; size: number }[]> {
  if (!/^image\//.test(mimeType)) return [];
  const results: { key: string; buffer: Buffer; width: number; height: number; mimeType: string; size: number }[] = [];
  for (const w of targetWidths) {
    const resized = await sharp(buffer).resize({ width: w, withoutEnlargement: true }).toBuffer();
    const meta = await sharp(resized).metadata();
    results.push({ key: `w${w}`, buffer: resized, width: meta.width || 0, height: meta.height || 0, mimeType, size: resized.length });
  }
  return results;
}
