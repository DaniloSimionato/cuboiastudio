import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, IsNotEmpty } from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateAssistantConversationDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsIn(["MANUAL_TEST", "SMOKE"])
  source?: "MANUAL_TEST" | "SMOKE";
}
