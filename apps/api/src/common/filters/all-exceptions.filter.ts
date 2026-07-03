import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Logger } from "nestjs-pino";

type ExceptionResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  providerStatus?: number;
  providerError?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
    param?: unknown;
  };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.resolvePayload(exception);
    const message = this.resolveMessage(exception, payload);

    this.logger.error(
      {
        err: exception,
        method: request.method,
        path: request.url,
        statusCode: status,
      },
      "Unhandled request failure",
    );

    response.status(status).json({
      statusCode: status,
      message,
      ...this.resolveSafeExtraFields(payload),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolvePayload(exception: unknown): ExceptionResponse | string | null {
    if (!(exception instanceof HttpException)) {
      return null;
    }

    const response = exception.getResponse();
    if (typeof response === "string") {
      return response;
    }

    if (typeof response === "object" && response !== null) {
      return response as ExceptionResponse;
    }

    return null;
  }

  private resolveMessage(
    exception: unknown,
    payload: ExceptionResponse | string | null,
  ): string | string[] {
    if (typeof payload === "string") {
      return payload;
    }

    if (payload && payload.message) {
      return payload.message;
    }

    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return "Internal server error";
  }

  private resolveSafeExtraFields(payload: ExceptionResponse | string | null): {
    providerStatus?: number;
    providerError?: {
      message?: string;
      type?: string;
      code?: string;
      param?: string;
    };
  } {
    if (!payload || typeof payload === "string") {
      return {};
    }

    return {
      ...(typeof payload.providerStatus === "number"
        ? { providerStatus: payload.providerStatus }
        : {}),
      ...(payload.providerError
        ? { providerError: this.resolveSafeProviderError(payload.providerError) }
        : {}),
    };
  }

  private resolveSafeProviderError(providerError: NonNullable<ExceptionResponse["providerError"]>):
    | {
        message?: string;
        type?: string;
        code?: string;
        param?: string;
      }
    | undefined {
    const safeProviderError = {
      ...(typeof providerError.message === "string" ? { message: providerError.message } : {}),
      ...(typeof providerError.type === "string" ? { type: providerError.type } : {}),
      ...(typeof providerError.code === "string" ? { code: providerError.code } : {}),
      ...(typeof providerError.param === "string" ? { param: providerError.param } : {}),
    };

    return Object.keys(safeProviderError).length > 0 ? safeProviderError : undefined;
  }
}
