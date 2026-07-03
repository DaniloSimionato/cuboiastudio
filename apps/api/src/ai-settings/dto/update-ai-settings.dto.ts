import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class UpdateAiSettingsDto {
  @Transform(({ value }) => (typeof value === "boolean" ? value : value === "true"))
  @IsOptional()
  @IsBoolean()
  runtimeEnabled?: boolean;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "provider must be at most 100 characters." })
  provider?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsUrl(
    { require_protocol: true, require_tld: false },
    { message: "baseUrl must be a valid URL including http:// or https://." },
  )
  @MaxLength(300, { message: "baseUrl must be at most 300 characters." })
  baseUrl?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "model must be at most 100 characters." })
  model?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: "apiKey must be at most 4000 characters." })
  apiKey?: string;

  @Transform(({ value }) =>
    typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1000, { message: "requestTimeoutMs must be at least 1000." })
  @Max(120000, { message: "requestTimeoutMs must be at most 120000." })
  requestTimeoutMs?: number;
}
