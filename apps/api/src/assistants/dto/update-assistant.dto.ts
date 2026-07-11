import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsBoolean,
  IsUrl,
} from "class-validator";
import { ContactMemoryCategory } from "@prisma/client";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

const splitResponseStyleValues = ["SINGLE", "NATURAL_BLOCKS"] as const;

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

  @IsOptional()
  @IsBoolean()
  memoryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  memoryPrePromptEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  memoryExtractionEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(ContactMemoryCategory, { each: true })
  memoryAllowedCategories?: ContactMemoryCategory[];

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
  @Max(1)
  memoryConfidenceThreshold?: number;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  memoryTempDefaultDays?: number;

  @IsOptional()
  @IsBoolean()
  memorySharedAcrossAssistants?: boolean;

  @IsOptional()
  @IsBoolean()
  semanticMemoryEnabled?: boolean;

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
  @Max(1)
  semanticMemoryThreshold?: number;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  semanticMemoryMaxCandidates?: number;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  semanticMemoryMaxResults?: number;

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

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCity?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessState?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessPostalCode?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessPhone?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessWhatsapp?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessWhatsappSupport?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsUrl()
  websiteUrl?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

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
  @IsIn(splitResponseStyleValues)
  @IsString()
  @MaxLength(50)
  splitResponseStyle?: string;

  @IsOptional()
  @IsBoolean()
  conversationResetEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conversationResetKeywords?: string[];

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conversationResetConfirmationMessage?: string;

  @IsOptional()
  @IsBoolean()
  conversationResetPreserveMemories?: boolean;

  @IsOptional()
  @IsBoolean()
  conversationResetSendInitialMessage?: boolean;
}
