import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ContactMemoryCategory } from "@prisma/client";

class RecentMessageDto {
  @IsString()
  @MaxLength(20)
  role!: string;

  @IsString()
  @MaxLength(1000)
  content!: string;
}

export class ExtractContactMemoryDto {
  @IsString()
  @MaxLength(120)
  profileId!: string;

  @IsString()
  @MaxLength(120)
  assistantId!: string;

  @IsString()
  @MaxLength(1000)
  currentMessage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceConversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceMessageId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentMessageDto)
  recentMessages?: RecentMessageDto[];

  @IsOptional()
  @IsArray()
  @IsEnum(ContactMemoryCategory, { each: true })
  allowedCategories?: ContactMemoryCategory[];
}
