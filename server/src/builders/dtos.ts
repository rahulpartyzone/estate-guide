import { IsInt, IsNumber, IsOptional, IsString, IsUrl, Matches } from 'class-validator';

export class BuilderCreateDto {
  @IsString() name!: string;
  @IsString() description!: string;
  @IsOptional() @IsInt() experienceYears?: number;
  @IsOptional() @IsNumber() rating?: number; // stored as Decimal(3,2)
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  // Allow absolute http(s) or leading slash API paths
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'logoUrl must be an absolute URL or start with /' }) logoUrl?: string;
}

export class BuilderUpdateDto extends BuilderCreateDto {}
