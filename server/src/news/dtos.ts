import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl, Matches } from 'class-validator';

export class NewsCreateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  excerpt!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @Matches(/^(https?:\/\/|\/)/, { message: 'imageUrl must be an absolute URL or start with /' })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;
}

export class NewsUpdateDto extends NewsCreateDto {}

export class NewsPublishDto {
  @IsBoolean()
  published!: boolean;
}
