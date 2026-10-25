import { BadRequestException, Body, Controller, Get, Injectable, Put, Res, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

export class SiteTextItemDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.-]{0,119}$/i, { message: 'Invalid label key' })
  key!: string;

  /** null or omitted = use the default wording */
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  value?: string | null;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

export class SiteTextSaveDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => SiteTextItemDto)
  items!: SiteTextItemDto[];
}

export type SiteTextMap = Record<string, { value?: string; hidden?: boolean }>;

@Injectable()
export class SiteTextService {
  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<SiteTextMap> {
    const rows = await this.prisma.siteText.findMany();
    const out: SiteTextMap = {};
    for (const r of rows) {
      out[r.key] = {
        ...(r.value !== null && r.value !== undefined ? { value: r.value } : {}),
        ...(r.hidden ? { hidden: true } : {}),
      };
    }
    return out;
  }

  /** Saves changes; an item back to default wording and not hidden removes its row. */
  async save(items: SiteTextItemDto[]): Promise<SiteTextMap> {
    const ops = items.map((i) => {
      const value = typeof i.value === 'string' ? i.value : null;
      const hidden = Boolean(i.hidden);
      if (value === null && !hidden) return this.prisma.siteText.deleteMany({ where: { key: i.key } });
      return this.prisma.siteText.upsert({ where: { key: i.key }, update: { value, hidden }, create: { key: i.key, value, hidden } });
    });
    if (!ops.length) throw new BadRequestException('Nothing to save');
    await this.prisma.$transaction(ops);
    return this.all();
  }
}

/** Public: the edited labels, read by every page of the website. */
@Controller('site-text')
export class SiteTextPublicController {
  constructor(private readonly svc: SiteTextService) {}

  @Get()
  async get(@Res({ passthrough: true }) res: Response) {
    // Short cache so an admin's edit shows up within a minute
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
    return this.svc.all();
  }
}

@Controller('admin/site-text')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('settings.write')
export class SiteTextAdminController {
  constructor(private readonly svc: SiteTextService) {}

  @Get()
  @RequirePermissions('settings.read|settings.write')
  get() {
    return this.svc.all();
  }

  @Put()
  save(@Body() dto: SiteTextSaveDto) {
    return this.svc.save(dto.items);
  }
}
