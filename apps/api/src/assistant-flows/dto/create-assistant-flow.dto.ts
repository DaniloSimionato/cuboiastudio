import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateAssistantFlowDto {
  @ApiPropertyOptional({ example: "Agendamento" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "Fluxo de agendamento de consultas" })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: '["agendar", "marcar"]' })
  @IsString()
  @IsOptional()
  triggerKeywords?: string | null;

  @ApiPropertyOptional({ example: "Cliente quer marcar consulta" })
  @IsString()
  @IsOptional()
  triggerDescription?: string | null;

  @ApiPropertyOptional({ example: "Ex: 'Quero agendar horário'" })
  @IsString()
  @IsOptional()
  triggerExamples?: string | null;

  @ApiPropertyOptional({ example: "Colete o horário e confirme..." })
  @IsString()
  @IsOptional()
  flowInstructions?: string | null;

  @ApiPropertyOptional({ example: '["calendar_checkAvailability"]' })
  @IsString()
  @IsOptional()
  allowedToolSlugs?: string | null;

  @ApiPropertyOptional({ example: '["knowledge_123"]' })
  @IsString()
  @IsOptional()
  knowledgeScope?: string | null;

  @ApiPropertyOptional({ example: "respond" })
  @IsString()
  @IsOptional()
  finalAction?: string | null;

  @ApiPropertyOptional({ example: "Redirecionando..." })
  @IsString()
  @IsOptional()
  fixedMessage?: string | null;

  @ApiPropertyOptional({ example: "team_123" })
  @IsString()
  @IsOptional()
  handoffTeamId?: string | null;

  @ApiPropertyOptional({ example: "Atendimento Financeiro" })
  @IsString()
  @IsOptional()
  handoffTeamName?: string | null;

  @ApiPropertyOptional({ example: '["financeiro"]' })
  @IsString()
  @IsOptional()
  chatwootLabels?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  autoRespond?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresHuman?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
