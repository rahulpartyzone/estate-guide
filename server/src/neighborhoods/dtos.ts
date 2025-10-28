import { IsNumber, IsOptional, IsString } from 'class-validator';

export class NeighborhoodCreateDto {
  @IsString()
  name!: string;
  @IsString()
  city!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsNumber()
  lat?: number;
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class NeighborhoodUpdateDto extends NeighborhoodCreateDto {}
