import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SubscriberCreateDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
