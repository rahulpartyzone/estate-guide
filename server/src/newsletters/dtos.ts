import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class NewsletterDto {
  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  previewText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'Pick up to 6 projects' })
  @IsString({ each: true })
  propertyIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaLabel?: string;

  @IsOptional()
  @ValidateIf((o) => typeof o.ctaUrl === 'string' && o.ctaUrl.trim() !== '')
  @IsString()
  @MaxLength(500)
  @Matches(/^https?:\/\//i, { message: 'Button link must start with https://' })
  ctaUrl?: string;
}

export class NewsletterTestDto {
  @IsOptional()
  @ValidateIf((o) => typeof o.email === 'string' && o.email.trim() !== '')
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;
}
