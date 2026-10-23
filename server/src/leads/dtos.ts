import { IsDateString, IsEmail, IsIn, IsInt, IsObject, Matches, MaxLength, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Max, Min } from 'class-validator';

/** Campaign info captured on the visitor's first visit (utm_*, gclid, referrer...). Sanitised in attribution.ts. */
class WithAttribution {
  @IsOptional()
  @IsObject()
  attribution?: Record<string, unknown>;
}

export class LeadBaseDto extends WithAttribution {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  // Optional: many visitors only leave a phone number
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @Matches(/^\+?[0-9\s-]{10,16}$/, { message: 'Enter a valid phone number' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
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

export class OTPVerifyDto extends WithAttribution {
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

export class LeadPreferenceDto extends WithAttribution {
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

export class WidgetVerifyDto extends WithAttribution {
  @IsString()
  accessToken!: string; // MSG91 widget access token

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  propertyName?: string;
}
