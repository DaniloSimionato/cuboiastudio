import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum StudioGlobalRole {
  STUDIO_ADMIN = "STUDIO_ADMIN",
  STUDIO_OPERATOR = "STUDIO_OPERATOR",
  STUDIO_VIEWER = "STUDIO_VIEWER",
}

export enum StudioCompanyRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export class StudioUserMembershipDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty({ enum: StudioCompanyRole })
  @IsEnum(StudioCompanyRole)
  role!: StudioCompanyRole;
}

export class CreateStudioUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  status!: Status;

  @ApiProperty({ enum: StudioGlobalRole })
  @IsEnum(StudioGlobalRole)
  globalRole!: StudioGlobalRole;

  @ApiProperty({ type: [StudioUserMembershipDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudioUserMembershipDto)
  memberships!: StudioUserMembershipDto[];
}

export class UpdateStudioUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ enum: StudioGlobalRole })
  @IsOptional()
  @IsEnum(StudioGlobalRole)
  globalRole?: StudioGlobalRole;

  @ApiPropertyOptional({ type: [StudioUserMembershipDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudioUserMembershipDto)
  memberships?: StudioUserMembershipDto[];
}
