import { IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Max, Min } from 'class-validator';

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

export const LEAD_STATUSES = ['new', 'contacted', 'closed', 'invalid'] as const;

export class LeadStatusUpdateDto {
  @IsIn(LEAD_STATUSES as unknown as string[])
  status!: string;
}

export class LeadPreferenceDto {
  @IsString()
  @IsNotEmpty()
  preferredPropertyType!: string;

  @IsString()
  @IsNotEmpty()
  preferredBudgetRange!: string;

  @IsString()
  @IsNotEmpty()
  preferredLocation!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  homeLoanAssistance!: 'yes' | 'no';

  @IsOptional()
  @IsString()
  sourcePage?: string;
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
