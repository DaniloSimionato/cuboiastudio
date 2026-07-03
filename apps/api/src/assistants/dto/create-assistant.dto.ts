import { Transform } from "class-transformer";
import { IsNumber, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateAssistantDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  initialMessage?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }

    return value;
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
