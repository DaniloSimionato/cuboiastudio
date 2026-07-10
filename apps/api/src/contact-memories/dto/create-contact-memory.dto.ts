import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ContactMemoryCategory } from "@prisma/client";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateContactMemoryDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(120)
  profileId!: string;

  @IsEnum(ContactMemoryCategory)
  category!: ContactMemoryCategory;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(120)
  key!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  value!: string;

  @IsOptional()
  valueJson?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(64)
  expiresAt?: string;
}
