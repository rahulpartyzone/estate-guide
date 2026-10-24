import { IsDateString, IsEmail, IsIn, IsInt, IsObject, IsUUID, Matches, MaxLength, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Max, Min, ValidateIf } from 'class-validator';

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

// Pipeline stages, in order. 'closed' is kept for leads marked closed before the pipeline existed.
export const LEAD_STATUSES = ['new', 'contacted', 'visit_scheduled', 'visited', 'negotiating', 'booked', 'lost', 'invalid', 'closed'] as const;
/** Stages that need no more follow-up. */
export const FINISHED_STATUSES = ['booked', 'lost', 'invalid', 'closed'];

/** Any combination; omitted fields are left alone, null clears owner / follow-up. */
export class LeadUpdateDto {
  @IsOptional()
  @IsIn(LEAD_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;
}

export class LeadNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;
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

  // Optional since the two-step form: a phone number is enough for the team to call back.
  @IsOptional()
  @ValidateIf((o) => typeof o.email === 'string' && o.email.trim() !== '')
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;

  @IsString()
  @Matches(/^\+?[0-9\s-]{10,16}$/, { message: 'Enter a valid phone number' })
  phone!: string;

  // Optional: "not sure" is a fine answer
  @IsOptional()
  @IsIn(['yes', 'no', ''])
  homeLoanAssistance?: 'yes' | 'no' | '';

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
