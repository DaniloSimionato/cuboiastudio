import { IsDefined, IsEnum } from "class-validator";
import { Status } from "@prisma/client";

export class UpdateAssistantStatusDto {
  @IsDefined()
  @IsEnum(Status)
  status!: Status;
}
