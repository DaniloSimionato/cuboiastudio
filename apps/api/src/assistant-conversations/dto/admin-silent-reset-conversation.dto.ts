import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, Min } from "class-validator";

export class AdminSilentResetConversationDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  expectedContextVersion!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  resumeAfterReset!: boolean;
}
