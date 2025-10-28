import { IsDateString, IsEmail, IsInt, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Max, Min } from 'class-validator';

export class LeadBaseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string; // Using string; can add phone validation pattern later.

  @IsOptional()
  @IsString()
  message?: string;
}

export class LeadSiteVisitDto extends LeadBaseDto {
  @IsOptional()
  @IsDateString()
  preferredDate?: string;
}

export class OTPRequestDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class OTPVerifyDto {
  @IsString()
  otp!: string;

  @IsOptional()
  @IsString()
  contact?: string; // phone or email
}

export class LeadStatusUpdateDto {
  @IsString()
  status!: string; // validate against enum values upstream if desired
}

export class WidgetVerifyDto {
  @IsString()
  accessToken!: string; // MSG91 widget access token

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  propertyName?: string;
}
