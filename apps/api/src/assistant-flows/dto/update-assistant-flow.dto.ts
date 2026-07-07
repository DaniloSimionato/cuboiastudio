import { PartialType } from "@nestjs/swagger";
import { CreateAssistantFlowDto } from "./create-assistant-flow.dto";

export class UpdateAssistantFlowDto extends PartialType(CreateAssistantFlowDto) {}
