import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertAssistantBehaviorDto {
  @ApiPropertyOptional({ example: "Giovanna" })
  @IsString()
  @IsOptional()
  attendantName?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showAttendantName?: boolean;

  @ApiPropertyOptional({ example: "Secretária virtual" })
  @IsString()
  @IsOptional()
  role?: string | null;

  @ApiPropertyOptional({ example: "Atende clientes e agenda horários." })
  @IsString()
  @IsOptional()
  howItActs?: string | null;

  @ApiPropertyOptional({ example: "Educada e simpática" })
  @IsString()
  @IsOptional()
  personality?: string | null;

  @ApiPropertyOptional({ example: "Profissional" })
  @IsString()
  @IsOptional()
  toneOfVoice?: string | null;

  @ApiPropertyOptional({ example: "whatsapp" })
  @IsString()
  @IsOptional()
  responseStyle?: string | null;

  @ApiPropertyOptional({ example: "low" })
  @IsString()
  @IsOptional()
  emojiUsage?: string | null;

  @ApiPropertyOptional({ example: "Olá! Como posso ajudar hoje?" })
  @IsString()
  @IsOptional()
  greetingMessage?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  noInventInfo?: boolean;

  @ApiPropertyOptional({ example: "fallback" })
  @IsString()
  @IsOptional()
  unknownBehavior?: string | null;

  @ApiPropertyOptional({ example: 300 })
  @IsInt()
  @Min(50)
  @Max(2000)
  @IsOptional()
  maxBlockLength?: number | null;
}
