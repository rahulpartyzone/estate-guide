import { IsEmail, IsOptional, IsString } from 'class-validator';

export class AgentCreateDto {
  @IsString()
  name!: string;
  @IsString()
  phone!: string;
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class AgentUpdateDto extends AgentCreateDto {}
