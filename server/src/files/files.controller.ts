import { BadRequestException, Body, Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { FilesService } from './files.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';

class CreateUploadUrlDto {
  @IsString() @MaxLength(255) filename!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) size!: number;
}

class CompleteUploadDto {
  @IsString() @MaxLength(255) key!: string;
  @IsString() @MaxLength(255) filename!: string;
  @IsString() @MaxLength(100) mimeType!: string;
}

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /** Direct upload, step 1: get a presigned URL for the browser to PUT the file to object storage. */
  @Post('upload-url')
  @UseGuards(JwtCookieAuthGuard)
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.files.createUploadUrl(dto.filename, dto.mimeType, dto.size);
  }

  /** Direct upload, step 2: after the PUT succeeds, register the file and get its id and URL. */
  @Post('complete')
  @UseGuards(JwtCookieAuthGuard)
  complete(@Body() dto: CompleteUploadDto) {
    return this.files.completeUpload(dto.key, dto.filename, dto.mimeType);
  }

  /**
   * Multipart upload through the API. On Vercel the request body is capped at 4.5 MB,
   * so the admin UI uses the direct-upload flow above whenever R2 is configured.
   */
  @Post()
  @UseGuards(JwtCookieAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('file field required');
    return this.files.upload(file.buffer, file.originalname, file.mimetype || 'application/octet-stream');
  }

  @Get(':id')
  async get(@Param('id') id: string, @Res() res: Response) {
    const f = await this.files.resolve(id);
    if ('redirectUrl' in f) {
      // Temporary redirect with a one-day cache, so the bucket's public URL can still change later.
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.redirect(302, f.redirectUrl);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', f.mimeType);
    res.setHeader('Content-Length', f.size.toString());
    // Allow embedding from a frontend on another origin (local dev on a different port)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Expose-Headers', 'ETag');
    res.setHeader('ETag', `${f.size}-${id}`);
    return res.end(f.buffer);
  }
}
