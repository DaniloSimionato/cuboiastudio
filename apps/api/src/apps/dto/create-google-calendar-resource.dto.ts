import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function toOptionalInt(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : Number(trimmed);
  }

  return value;
}

function toOptionalBoolean(value: unknown): unknown {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return value;
}

export class CreateGoogleCalendarResourceDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  installationId?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  calendarId!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sportType?: string;

  @Transform(({ value }) => toOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  isCovered?: boolean;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  resourceTypeId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  attributeId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotMinutes?: number;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDurationMinutes?: number;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  minAdvanceMinutes?: number;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxDaysAhead?: number;

  @Transform(({ value }) => toOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
