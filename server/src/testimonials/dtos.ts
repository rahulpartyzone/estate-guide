import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

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
}

export class TestimonialUpdateDto {
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
}

export class PublishDto {
  @IsBoolean()
  published!: boolean;
}
