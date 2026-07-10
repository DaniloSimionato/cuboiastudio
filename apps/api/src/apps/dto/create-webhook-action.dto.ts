import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateWebhookActionDto {
  @IsString()
  @IsNotEmpty()
  installationId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  descriptionAdmin?: string;

  @IsString()
  @IsOptional()
  descriptionAi?: string;

  @IsEnum(["GET", "POST", "PUT", "DELETE", "PATCH"])
  method!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

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
