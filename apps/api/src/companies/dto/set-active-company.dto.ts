import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class SetActiveCompanyDto {
  @ApiProperty({ example: "cmr_empresa_demo" })
  @IsString()
  @MaxLength(64)
  companyId!: string;
}
