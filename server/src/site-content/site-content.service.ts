import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutiveCreateDto, ExecutiveUpdateDto, SiteProfileUpsertDto } from './dtos';

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

  async getPublicProfile() {
    const profile = await this.db.siteProfile.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { executives: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    return profile || null;
  }

  async getAdminProfile() {
    return this.getPublicProfile();
  }

  async upsertProfile(dto: SiteProfileUpsertDto) {
    const existing = await this.db.siteProfile.findFirst({ orderBy: { createdAt: 'asc' } });

    const has = (key: keyof SiteProfileUpsertDto) => Object.prototype.hasOwnProperty.call(dto, key);
    const toNullableString = (value?: string) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const data: any = {};
    if (has('companyName')) data.companyName = (dto.companyName || '').trim();
    if (has('reraNumber')) data.reraNumber = toNullableString(dto.reraNumber);
    if (has('tagline')) data.tagline = toNullableString(dto.tagline);
    if (has('description')) data.description = toNullableString(dto.description);
    if (has('aboutHeroImageUrl')) data.aboutHeroImageUrl = toNullableString(dto.aboutHeroImageUrl);
    if (has('landingHeroImageUrl')) data.landingHeroImageUrl = toNullableString(dto.landingHeroImageUrl);
    if (has('projectsHeroImageUrl')) data.projectsHeroImageUrl = toNullableString(dto.projectsHeroImageUrl);
    if (has('buildersHeroImageUrl')) data.buildersHeroImageUrl = toNullableString(dto.buildersHeroImageUrl);
    if (has('newsHeroImageUrl')) data.newsHeroImageUrl = toNullableString(dto.newsHeroImageUrl);
    if (has('landingHeroTitlePrefix')) data.landingHeroTitlePrefix = toNullableString(dto.landingHeroTitlePrefix);
    if (has('landingHeroTitleHighlight')) data.landingHeroTitleHighlight = toNullableString(dto.landingHeroTitleHighlight);
    if (has('landingHeroDescription')) data.landingHeroDescription = toNullableString(dto.landingHeroDescription);
    if (has('landingHeroStat1Value')) data.landingHeroStat1Value = toNullableString(dto.landingHeroStat1Value);
    if (has('landingHeroStat1Label')) data.landingHeroStat1Label = toNullableString(dto.landingHeroStat1Label);
    if (has('landingHeroStat2Value')) data.landingHeroStat2Value = toNullableString(dto.landingHeroStat2Value);
    if (has('landingHeroStat2Label')) data.landingHeroStat2Label = toNullableString(dto.landingHeroStat2Label);
    if (has('landingHeroStat3Value')) data.landingHeroStat3Value = toNullableString(dto.landingHeroStat3Value);
    if (has('landingHeroStat3Label')) data.landingHeroStat3Label = toNullableString(dto.landingHeroStat3Label);
    if (has('linkedinUrl')) data.linkedinUrl = toNullableString(dto.linkedinUrl);
    if (has('facebookUrl')) data.facebookUrl = toNullableString(dto.facebookUrl);
    if (has('instagramUrl')) data.instagramUrl = toNullableString(dto.instagramUrl);
    if (has('googleUrl')) data.googleUrl = toNullableString(dto.googleUrl);
    if (has('whatsappNumber')) data.whatsappNumber = toNullableString(dto.whatsappNumber);
    if (has('phone')) data.phone = toNullableString(dto.phone);
    if (has('email')) data.email = toNullableString(dto.email);
    if (has('website')) data.website = toNullableString(dto.website);
    if (has('address')) data.address = toNullableString(dto.address);
    if (has('logoUrl')) data.logoUrl = toNullableString(dto.logoUrl);
    if (has('headerLogoUrl')) data.headerLogoUrl = toNullableString(dto.headerLogoUrl);
    if (has('ga4MeasurementId')) data.ga4MeasurementId = toNullableString(dto.ga4MeasurementId)?.toUpperCase() ?? null;
    if (has('metaPixelId')) data.metaPixelId = toNullableString(dto.metaPixelId);

    if (existing) {
      return this.db.siteProfile.update({
        where: { id: existing.id },
        data,
        include: { executives: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
      });
    }

    if (!dto.companyName?.trim()) {
      throw new BadRequestException('companyName is required to create site profile');
    }

    return this.db.siteProfile.create({
      data: { ...data, companyName: dto.companyName.trim() },
      include: { executives: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
  }

  async createExecutive(dto: ExecutiveCreateDto) {
    const profile = await this.db.siteProfile.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!profile) throw new BadRequestException('Create company profile first');

    return this.db.executive.create({
      data: {
        siteProfileId: profile.id,
        name: dto.name,
        role: dto.role,
        bio: dto.bio?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateExecutive(id: string, dto: ExecutiveUpdateDto) {
    const existing = await this.db.executive.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Executive not found');

    return this.db.executive.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        bio: dto.bio?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
    });
  }

  async deleteExecutive(id: string) {
    const existing = await this.db.executive.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Executive not found');
    await this.db.executive.delete({ where: { id } });
  }
}
