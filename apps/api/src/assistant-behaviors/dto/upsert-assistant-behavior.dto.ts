import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const behaviorResponseStyles = ["whatsapp", "formal", "concise"] as const;
const emojiUsageValues = ["none", "low", "moderate"] as const;
const unknownBehaviorValues = ["fallback", "handoff", "search_base"] as const;

export class UpsertAssistantBehaviorDto {
  @ApiPropertyOptional({ example: "Giovanna" })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  attendantName?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showAttendantName?: boolean;

  @ApiPropertyOptional({ example: "Secretária virtual" })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  role?: string | null;

  @ApiPropertyOptional({ example: "Atende clientes e agenda horários." })
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  howItActs?: string | null;

  @ApiPropertyOptional({ example: "Educada e simpática" })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  personality?: string | null;

  @ApiPropertyOptional({ example: "Profissional" })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  toneOfVoice?: string | null;

  @ApiPropertyOptional({ example: "whatsapp" })
  @IsIn(behaviorResponseStyles)
  @IsOptional()
  responseStyle?: string | null;

  @ApiPropertyOptional({ example: "low" })
  @IsIn(emojiUsageValues)
  @IsOptional()
  emojiUsage?: string | null;

  @ApiPropertyOptional({ example: "Olá! Como posso ajudar hoje?" })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  greetingMessage?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  noInventInfo?: boolean;

  @ApiPropertyOptional({ example: "fallback" })
  @IsIn(unknownBehaviorValues)
  @IsOptional()
  unknownBehavior?: string | null;

  @ApiPropertyOptional({ example: 300 })
  @Transform(({ value }) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value))
  @IsInt()
  @Min(50)
  @Max(2000)
  @IsOptional()
  maxBlockLength?: number | null;
}
