import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

// Uploaded files are either absolute URLs (R2) or /api/... paths (files stored in the database).
// Anything else (javascript:, data:, ...) is rejected so it can never end up in an href on the site.
const FILE_URL = /^(https?:\/\/|\/api\/)/;
const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export class TestimonialCreateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsString()
  @IsNotEmpty()
  company!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  /** Send null to remove. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(FILE_URL, { message: 'photoUrl must be an uploaded file URL' })
  photoUrl?: string | null;

  /** Send null to remove. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(FILE_URL, { message: 'attachmentUrl must be an uploaded file URL' })
  attachmentUrl?: string | null;

  @IsOptional()
  @IsIn(ATTACHMENT_TYPES)
  attachmentMimeType?: string | null;
}

export class TestimonialUpdateDto extends TestimonialCreateDto {}

export class PublishDto {
  @IsBoolean()
  published!: boolean;
}
