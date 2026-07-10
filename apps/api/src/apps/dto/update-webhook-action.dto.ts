import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateWebhookActionDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  descriptionAdmin?: string;

  @IsString()
  @IsOptional()
  descriptionAi?: string;

  @IsEnum(["GET", "POST", "PUT", "DELETE", "PATCH"])
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsOptional()
  headers?: any;

  @IsString()
  @IsOptional()
  authType?: string;

  @IsOptional()
  authConfig?: any;

  @IsString()
  @IsOptional()
  bodyTemplate?: string;

  @IsOptional()
  parameterSchema?: any;

  @IsInt()
  @Min(100)
  @Max(30000)
  @IsOptional()
  timeoutMs?: number;

  @IsEnum(["READ", "WRITE"])
  @IsOptional()
  permissionType?: string;

  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean;

  @IsOptional()
  responseFilter?: any;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
