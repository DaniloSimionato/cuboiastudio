import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class UpsertChatwootInboxConfigDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(255)
  baseUrl!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  accountId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  inboxId!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(80)
  assistantId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  apiAccessToken?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  webhookSecret?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "boolean" ? value : value === "true"))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadataJson?: Record<string, unknown>;
}
