import { IsInt, IsOptional, IsString, IsUrl, Matches, Min } from 'class-validator';

export class SiteProfileUpsertDto {
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() reraNumber?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'aboutHeroImageUrl must be an absolute URL or start with /' }) aboutHeroImageUrl?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'landingHeroImageUrl must be an absolute URL or start with /' }) landingHeroImageUrl?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'projectsHeroImageUrl must be an absolute URL or start with /' }) projectsHeroImageUrl?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'buildersHeroImageUrl must be an absolute URL or start with /' }) buildersHeroImageUrl?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'newsHeroImageUrl must be an absolute URL or start with /' }) newsHeroImageUrl?: string;
  @IsOptional() @IsString() landingHeroTitlePrefix?: string;
  @IsOptional() @IsString() landingHeroTitleHighlight?: string;
  @IsOptional() @IsString() landingHeroDescription?: string;
  @IsOptional() @IsString() landingHeroStat1Value?: string;
  @IsOptional() @IsString() landingHeroStat1Label?: string;
  @IsOptional() @IsString() landingHeroStat2Value?: string;
  @IsOptional() @IsString() landingHeroStat2Label?: string;
  @IsOptional() @IsString() landingHeroStat3Value?: string;
  @IsOptional() @IsString() landingHeroStat3Label?: string;
  @IsOptional() @IsUrl() linkedinUrl?: string;
  @IsOptional() @IsUrl() facebookUrl?: string;
  @IsOptional() @IsUrl() instagramUrl?: string;
  @IsOptional() @IsUrl() googleUrl?: string;
  @IsOptional() @IsString() whatsappNumber?: string;
  // Analytics. Empty string clears the value.
  @IsOptional() @Matches(/^(G-[A-Z0-9]{4,20})?$/i, { message: 'GA4 Measurement ID looks like G-XXXXXXXXXX' }) ga4MeasurementId?: string;
  @IsOptional() @Matches(/^([0-9]{6,20})?$/, { message: 'Meta Pixel ID is a number, e.g. 123456789012345' }) metaPixelId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'logoUrl must be an absolute URL or start with /' }) logoUrl?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'headerLogoUrl must be an absolute URL or start with /' }) headerLogoUrl?: string;
}

export class ExecutiveCreateDto {
  @IsString() name!: string;
  @IsString() role!: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'imageUrl must be an absolute URL or start with /' }) imageUrl?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class ExecutiveUpdateDto extends ExecutiveCreateDto {}
