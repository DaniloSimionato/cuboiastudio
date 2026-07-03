import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService, type HealthResponse } from "./health.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("health")
  @ApiOperation({ summary: "Basic service healthcheck" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
      required: ["ok"],
    },
  })
  getHealth(): HealthResponse {
    return this.healthService.getStatus();
  }
}
