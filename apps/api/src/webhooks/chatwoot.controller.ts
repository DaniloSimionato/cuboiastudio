import { randomUUID } from "node:crypto";
import { Body, Controller, Headers, Param, Post, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ChatwootWebhookService } from "../chatwoot/chatwoot-webhook.service";

@ApiTags("webhooks")
@Controller("webhooks/chatwoot")
export class ChatwootController {
  constructor(private readonly chatwootWebhookService: ChatwootWebhookService) {}

  private resolveTraceId(
    requestId?: string,
    correlationId?: string,
  ): { requestId: string; correlationId: string | null } {
    const normalizedRequestId = requestId?.trim() || randomUUID();
    const normalizedCorrelationId = correlationId?.trim() || null;

    return {
      requestId: normalizedRequestId,
      correlationId: normalizedCorrelationId,
    };
  }

  @Post()
  @ApiOperation({
    summary: "Receive a Chatwoot webhook and process it through the shared pipeline",
  })
  @ApiQuery({
    name: "secret",
    required: false,
    description: "Secret enviado na query string do webhook. Fluxo principal em produção.",
  })
  @ApiBadRequestResponse({
    description: "Returned when the payload is invalid or the conversation cannot be resolved.",
  })
  async handleMessageCreated(
    @Body() payload: unknown,
    @Query("secret") querySecret: string | undefined,
    @Headers("x-chatwoot-webhook-secret") legacyWebhookSecret: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Headers("x-correlation-id") correlationId: string | undefined,
  ): Promise<{ ok: true; source: "chatwoot"; conversationId?: string; messageId?: string; ignored?: boolean; reason?: string }> {
    const trace = this.resolveTraceId(requestId, correlationId);
    return this.chatwootWebhookService.processMessageCreated({
      payload,
      webhookSecret: querySecret?.trim() || legacyWebhookSecret?.trim() || null,
      requestId: trace.requestId,
      correlationId: trace.correlationId,
    });
  }

  @Post(":assistantId/message-created")
  @ApiOperation({
    summary: "Legacy Chatwoot message_created webhook that still accepts an assistant id in the URL",
  })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id mapped to the Chatwoot inbox/channel",
  })
  @ApiBadRequestResponse({
    description: "Returned when the payload is invalid or the conversation cannot be resolved.",
  })
  async handleLegacyMessageCreated(
    @Param("assistantId") assistantId: string,
    @Body() payload: unknown,
    @Query("secret") querySecret: string | undefined,
    @Headers("x-chatwoot-webhook-secret") legacyWebhookSecret: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Headers("x-correlation-id") correlationId: string | undefined,
  ): Promise<{ ok: true; source: "chatwoot"; conversationId?: string; messageId?: string; ignored?: boolean; reason?: string }> {
    const trace = this.resolveTraceId(requestId, correlationId);
    return this.chatwootWebhookService.processMessageCreated({
      assistantId,
      payload,
      webhookSecret: querySecret?.trim() || legacyWebhookSecret?.trim() || null,
      requestId: trace.requestId,
      correlationId: trace.correlationId,
    });
  }
}
