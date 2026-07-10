import { Transform } from "class-transformer";
import { IsNumber, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, IsBoolean, IsUrl } from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class UpdateAssistantDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  initialMessage?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(16000)
  instructions?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }

    return value;
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fallbackMessage?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  safetyInstruction?: string;

  @IsOptional()
  @IsBoolean()
  ragEnabled?: boolean;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessAddress?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCityRegion?: string;

  @IsOptional()
  weeklySchedule?: any;

  @IsOptional()
  @IsBoolean()
  aiAlwaysAvailable?: boolean;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  personality?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  toneOfVoice?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avoidPhrases?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsUrl()
  googleMapsUrl?: string;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  messageBufferEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(20)
  messageBufferSeconds?: number;

  @IsOptional()
  @IsBoolean()
  splitResponseEnabled?: boolean;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  splitResponseStyle?: string;
}
