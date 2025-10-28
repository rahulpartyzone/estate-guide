import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, PropertyType } from './enums';

export class PriceDto {
  @IsOptional() @Type(() => Number) @IsNumber()
  min?: number;
  @IsOptional() @Type(() => Number) @IsNumber()
  max?: number;
  @IsString() currency!: string;
}

export class SizeDto {
  @IsInt() min!: number;
  @IsInt() max!: number;
  @IsString() unit!: string;
}

export class CoordinatesDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
}

export class ImageDto {
  // Accept absolute http(s) URLs OR relative paths (starting with /)
  @Matches(/^(https?:\/\/|\/)/, { message: 'url must be an absolute URL or leading-slash path' })
  url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class FloorPlanDto {
  @IsString() unitType!: string;
  @IsInt() size!: number;
  @IsString() unit!: string;
  @IsNumber() price!: number;
  @IsString() currency!: string;
  @Matches(/^(https?:\/\/|\/)/, { message: 'imageUrl must be an absolute URL or leading-slash path' })
  imageUrl!: string;
  @IsOptional() @Type(() => Number) @IsInt()
  bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt()
  bathrooms?: number;
}

export class PropertyCreateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsString() description!: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsString() city!: string;
  @IsString() area!: string;
  @IsString() builderId!: string;
  @IsEnum(PropertyType) propertyType!: PropertyType;
  @IsEnum(ProjectStatus) status!: ProjectStatus;
  @IsOptional() @IsBoolean() isHotProject?: boolean;

  @ValidateNested() @Type(() => PriceDto) price!: PriceDto;
  @ValidateNested() @Type(() => SizeDto) size!: SizeDto;

  @IsOptional() @IsInt() bedrooms?: number;
  @IsOptional() @IsInt() bathrooms?: number;
  @IsOptional() @IsDateString() completionDate?: string;
  @IsOptional() @ValidateNested() @Type(() => CoordinatesDto) coordinates?: CoordinatesDto;

  @Matches(/^(https?:\/\/|\/)/, { message: 'mainImageUrl must be an absolute URL or leading-slash path' })
  mainImageUrl!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImageDto) images!: ImageDto[];
  @IsArray() @IsString({ each: true }) amenities!: string[];
  @IsOptional() @ValidateNested({ each: true }) @Type(() => FloorPlanDto) floorPlans?: FloorPlanDto[];
  @IsOptional() @IsBoolean() published?: boolean;
  @IsOptional() @Matches(/^(https?:\/\/|\/)/, { message: 'brochureUrl must be an absolute URL or leading-slash path' })
  brochureUrl?: string;
}

export class PropertyUpdateDto extends PropertyCreateDto {}

export class PresignRequestDto {
  @IsString() contentType!: string;
}

export class PropertyListQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsString() builderId?: string;
  @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsBoolean() isHot?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() priceMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() priceMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() radiusKm?: number;
  @IsOptional() @IsString() sort?: 'newest' | 'price' | 'name' | 'distance';
  @IsOptional() @IsString() order?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}
