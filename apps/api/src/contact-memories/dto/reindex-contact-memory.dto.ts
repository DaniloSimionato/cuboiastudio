import { IsOptional, IsString } from "class-validator";

export class ReindexContactMemoryDto {
  @IsOptional()
  @IsString()
  memoryId?: string;

  @IsOptional()
  @IsString()
  memoryItemId?: string;

  @IsOptional()
  @IsString()
  assistantId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  version?: string;
}
