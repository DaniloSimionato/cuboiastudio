import { PartialType } from "@nestjs/swagger";
import { CreateGoogleCalendarResourceDto } from "./create-google-calendar-resource.dto";

export class UpdateGoogleCalendarResourceDto extends PartialType(CreateGoogleCalendarResourceDto) {}
