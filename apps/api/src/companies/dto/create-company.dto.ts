import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({ example: "Clínica Exemplo" })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "Clínica Exemplo LTDA" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: "12.345.678/0001-99" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  document?: string;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ example: "Cliente de homologação para testes multitenant." })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Quando true, cria um assistente demo explícito para o tenant recém-criado.",
  })
  @IsOptional()
  @IsBoolean()
  createDemoAssistant?: boolean;
}
