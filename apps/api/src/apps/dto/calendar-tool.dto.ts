import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { GoogleCalendarBookingStatus } from "@prisma/client";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function optionalTrimmedString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : Number(trimmed);
  }

  return value;
}

function optionalBooleanOrNull(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "" || normalized === "null") {
      return null;
    }

    return normalized === "true";
  }

  return value;
}

export class CheckCalendarAvailabilityDto {
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  conversationId?: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sportType?: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @Transform(({ value }) => optionalBooleanOrNull(value))
  @IsOptional()
  @IsBoolean()
  isCovered?: boolean | null;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  timeFrom!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  timeTo!: string;

  @Transform(({ value }) => optionalNumber(value))
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @Transform(({ value }) => optionalNumber(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxOptions?: number;
}

export class CreateCalendarBookingDto {
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  conversationId?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  resourceId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  contactPhone!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class FindCalendarBookingsQueryDto {
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @Transform(({ value }) => (typeof value === "string" ? value.split(",") : value))
  @IsOptional()
  @IsArray()
  @IsIn([GoogleCalendarBookingStatus.CONFIRMED, GoogleCalendarBookingStatus.CANCELLED, GoogleCalendarBookingStatus.RESCHEDULED, GoogleCalendarBookingStatus.ERROR, GoogleCalendarBookingStatus.FAILED], {
    each: true,
  })
  status?: GoogleCalendarBookingStatus[];

  @Transform(({ value }) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim().toLowerCase() !== "false";
    return value;
  })
  @IsOptional()
  @IsBoolean()
  fromNow?: boolean;
}

export class RescheduleCalendarBookingDto {
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  newResourceId?: string;

  @IsDateString()
  newStartAt!: string;

  @IsDateString()
  newEndAt!: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CancelCalendarBookingDto {
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
