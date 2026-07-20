import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { RUNTIME_V2_FLOW_SCOPES } from "../runtime-v2-flow-scope";

export class AssistantFlowCalendarToolContextDto {
  @ApiPropertyOptional({ example: "Padel" })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ example: "Padel" })
  @IsOptional()
  @IsString()
  sportType?: string | null;

  @ApiPropertyOptional({ example: "quadra" })
  @IsOptional()
  @IsString()
  resourceType?: string | null;

  @ApiPropertyOptional({ example: "coberta" })
  @IsOptional()
  @IsString()
  attribute?: string | null;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCovered?: boolean | null;

  @ApiPropertyOptional({ example: ["resource_123"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resourceIds?: string[] | null;

  @ApiPropertyOptional({ example: ["agenda@group.calendar.google.com"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  calendarIds?: string[] | null;
}

export class AssistantFlowToolContextDto {
  @ApiPropertyOptional({
    type: AssistantFlowCalendarToolContextDto,
    example: {
      category: "Padel",
      sportType: "Padel",
      resourceType: "quadra",
      durationMinutes: 60,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantFlowCalendarToolContextDto)
  calendar?: AssistantFlowCalendarToolContextDto | null;
}

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

  @ApiPropertyOptional({ type: AssistantFlowToolContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantFlowToolContextDto)
  toolContext?: AssistantFlowToolContextDto | null;

  @ApiPropertyOptional({ enum: RUNTIME_V2_FLOW_SCOPES })
  @IsOptional()
  @IsIn(RUNTIME_V2_FLOW_SCOPES)
  runtimeScope?: "V1_ONLY" | "V2_CONTROLLED" | null;

  @ApiPropertyOptional({ example: "businessHours" })
  @IsOptional()
  @IsString()
  runtimeCategory?: string | null;

  @ApiPropertyOptional({ example: "ask_business_hours" })
  @IsOptional()
  @IsString()
  runtimeIntent?: string | null;

  @ApiPropertyOptional({ example: "OFFICIAL_CONTEXT" })
  @IsOptional()
  @IsString()
  runtimeAuthority?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  runtimeDirectOnly?: boolean | null;

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
