import { IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class BuyerWidgetLoginDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  accessToken!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class BuyerUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => typeof o.email === 'string' && o.email.trim() !== '')
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(200)
  email?: string;
}
