import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

export class AssistantToolConfigDto {
  @IsString()
  @IsNotEmpty()
  appId!: string;

  @IsString()
  @IsNotEmpty()
  toolName!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsEnum(["READ", "WRITE"])
  permissionType!: "READ" | "WRITE";

  @IsBoolean()
  requiresConfirmation!: boolean;
}

export class UpdateAssistantToolsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantToolConfigDto)
  tools!: AssistantToolConfigDto[];
}
