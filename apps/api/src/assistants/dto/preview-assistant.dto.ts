import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsBoolean } from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class PreviewAssistantDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;

  @IsOptional()
  @IsBoolean()
  usePreparedKnowledge?: boolean;
}
