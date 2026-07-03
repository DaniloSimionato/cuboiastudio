import { IsDefined, IsIn } from "class-validator";
import { AppInstallationStatus } from "@prisma/client";

export class UpdateAppInstallationStatusDto {
  @IsDefined()
  @IsIn([AppInstallationStatus.ACTIVE, AppInstallationStatus.INACTIVE])
  status!: AppInstallationStatus;
}
