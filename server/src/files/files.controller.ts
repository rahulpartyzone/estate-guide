import { Controller, Get, Param, Post, UploadedFile, UseInterceptors, Res, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { createHash } from 'crypto';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @UseGuards(JwtCookieAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  }))
  async upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('file field required');
    // Basic mime enforcement (allow images + pdf) - extendable
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
    const mime = file.mimetype || 'application/octet-stream';
    if (!allowed.includes(mime)) throw new BadRequestException('Unsupported file type');
    // Very light sniff: check JPEG/PNG/PDF magic numbers if image/pdf
    const buf: Buffer = file.buffer;
    const isJpeg = buf.slice(0,2).toString('hex') === 'ffd8';
    const isPng = buf.slice(0,8).toString('hex') === '89504e470d0a1a0a';
    const isPdf = buf.slice(0,4).toString() === '%PDF';
    if (mime.startsWith('image/jpeg') && !isJpeg) throw new BadRequestException('JPEG signature mismatch');
    if (mime === 'image/png' && !isPng) throw new BadRequestException('PNG signature mismatch');
    if (mime === 'application/pdf' && !isPdf) throw new BadRequestException('PDF signature mismatch');
    const stored = await this.files.upload(buf, file.originalname, mime);
    return stored;
  }

  @Get(':id')
  async get(@Param('id') id: string, @Res() res: Response) {
    const f = await this.files.fetch(id);
    res.setHeader('Content-Type', f.mimeType);
    res.setHeader('Content-Length', f.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Ensure the image can be embedded cross-origin in dev when frontend runs on a different port
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Expose-Headers', 'ETag');
    // Basic ETag using size; for stronger caching include checksum in future
    res.setHeader('ETag', `${f.size}-${id}`);
    return res.end(f.buffer);
  }
}
