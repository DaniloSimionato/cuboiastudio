import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

class SendAssistantConversationAttachmentDto {
  @IsIn(["image", "document", "audio", "video", "gif"])
  type!: "image" | "document" | "audio" | "video" | "gif";

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  mimeType!: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  dataUrl?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  url?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  thumbUrl?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(1000)
  caption?: string;

  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(4000)
  extractedText?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(4000)
  transcript?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  attachmentStoragePending?: boolean;
}

class SendAssistantConversationContactDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;
}

class SendAssistantConversationLocationDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(160)
  label?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class SendAssistantConversationMessageDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsIn(["tests", "chatwoot", "manual"])
  source?: "tests" | "chatwoot" | "manual";

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalMessageId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalAccountId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalConversationId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalContactId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalSenderId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalSenderIdentifier?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalSenderName?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(80)
  externalSenderPhone?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalChannelId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  externalInboxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  messageType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendAssistantConversationAttachmentDto)
  attachments?: SendAssistantConversationAttachmentDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SendAssistantConversationContactDto)
  contact?: SendAssistantConversationContactDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SendAssistantConversationLocationDto)
  location?: SendAssistantConversationLocationDto;
}
