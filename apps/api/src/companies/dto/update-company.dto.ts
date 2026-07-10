import { ApiPropertyOptional } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: "Clínica Exemplo" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: "Clínica Exemplo LTDA" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string | null;

  @ApiPropertyOptional({ example: "12.345.678/0001-99" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  document?: string | null;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ example: "Empresa pausada para reconfiguração." })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional({ example: "America/Sao_Paulo" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string | null;
}
