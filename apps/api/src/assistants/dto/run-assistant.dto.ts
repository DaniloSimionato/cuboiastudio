import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class RunAssistantDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}
