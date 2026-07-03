import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class TestAiProviderDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}
