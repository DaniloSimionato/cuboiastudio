import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

type UsageSource = "openai" | "not_configured" | "unavailable";

export type UsageSummary = {
  source: UsageSource;
  message: string | null;
  generatedAt: string;
  currency: "USD";
  month: {
    totalTokens: number;
    requests: number;
    actualCost: number;
    previousActualCost: number;
  };
  dailyCosts: Array<{ date: string; cost: number }>;
  byModel: Array<{ model: string; tokens: number; requests: number; share: number }>;
  runtime: {
    averageResponseMs: number;
    resolvedConversations: number;
    handoffs: number;
  };
};

type CacheValue = { expiresAt: number; summary: UsageSummary };

const CACHE_TTL_MS = 60_000;
const MAX_USAGE_BUCKETS = 31;

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);
  private readonly cache = new Map<string, CacheValue>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSummary(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<UsageSummary> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const now = new Date();
    const project = await this.prisma.companyAiSettings.findUnique({
      where: { companyId: input.tenant.companyId },
      select: { openAiProjectId: true },
    });
    const projectId = project?.openAiProjectId?.trim() ?? "";
    const adminApiKey = this.configService.get<string>("OPENAI_ADMIN_API_KEY")?.trim() ?? "";

    if (!projectId || !adminApiKey) {
      return this.emptySummary(
        now,
        "not_configured",
        !adminApiKey
          ? "A chave administrativa da OpenAI ainda não foi configurada no servidor."
          : "Informe o ID do Projeto OpenAI desta empresa em Configurações de IA.",
      );
    }

    const cached = this.cache.get(input.tenant.companyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.summary;
    }

    try {
      const summary = await this.fetchOfficialSummary({
        companyId: input.tenant.companyId,
        projectId,
        adminApiKey,
        now,
      });
      this.cache.set(input.tenant.companyId, { summary, expiresAt: Date.now() + CACHE_TTL_MS });
      return summary;
    } catch (error) {
      this.logger.warn({
        event: "openai_usage_read_failed",
        companyId: input.tenant.companyId,
        error: this.safeErrorCode(error),
      });
      return this.emptySummary(
        now,
        "unavailable",
        "Não foi possível consultar os dados oficiais da OpenAI agora. Tente novamente em instantes.",
      );
    }
  }

  private async fetchOfficialSummary(input: {
    companyId: string;
    projectId: string;
    adminApiKey: string;
    now: Date;
  }): Promise<UsageSummary> {
    const client = new OpenAI({ apiKey: input.adminApiKey, timeout: 15_000, maxRetries: 1 });
    const currentMonthStart = utcMonthStart(input.now);
    const previousMonthStart = utcMonthStart(
      new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth() - 1, 1)),
    );
    const endTime = unixSeconds(input.now);

    const [costs, completions, runtime] = await Promise.all([
      client.admin.organization.usage.costs({
        start_time: unixSeconds(previousMonthStart),
        end_time: endTime,
        bucket_width: "1d",
        limit: 180,
        project_ids: [input.projectId],
        group_by: ["project_id"],
      }),
      client.admin.organization.usage.completions({
        start_time: unixSeconds(currentMonthStart),
        end_time: endTime,
        bucket_width: "1d",
        limit: MAX_USAGE_BUCKETS,
        project_ids: [input.projectId],
        group_by: ["project_id", "model"],
      }),
      this.getRuntimeMetrics(input.companyId, currentMonthStart),
    ]);

    const monthlyCost = new Map<string, number>();
    let currentActualCost = 0;
    let previousActualCost = 0;

    for (const bucket of costs.data) {
      const day = toUtcDate(bucket.start_time);
      const cost = bucket.results.reduce(
        (sum, result) => sum + (isCostResult(result) ? (result.amount?.value ?? 0) : 0),
        0,
      );
      monthlyCost.set(day, cost);
      if (bucket.start_time >= unixSeconds(currentMonthStart)) currentActualCost += cost;
      else previousActualCost += cost;
    }

    let totalTokens = 0;
    let requests = 0;
    const models = new Map<string, { tokens: number; requests: number }>();
    for (const bucket of completions.data) {
      for (const result of bucket.results) {
        if (!isCompletionsResult(result)) continue;
        const tokens =
          result.input_tokens +
          result.output_tokens +
          (result.input_audio_tokens ?? 0) +
          (result.output_audio_tokens ?? 0);
        const requestCount = result.num_model_requests;
        totalTokens += tokens;
        requests += requestCount;
        const model = result.model ?? "Modelo não identificado";
        const existing = models.get(model) ?? { tokens: 0, requests: 0 };
        existing.tokens += tokens;
        existing.requests += requestCount;
        models.set(model, existing);
      }
    }

    return {
      source: "openai",
      message:
        "Dados oficiais da OpenAI; o custo pode ter pequena defasagem até o processamento da fatura.",
      generatedAt: input.now.toISOString(),
      currency: "USD",
      month: { totalTokens, requests, actualCost: currentActualCost, previousActualCost },
      dailyCosts: recentUtcDays(input.now, 14).map((date) => ({
        date,
        cost: monthlyCost.get(date) ?? 0,
      })),
      byModel: [...models.entries()]
        .map(([model, value]) => ({
          model,
          ...value,
          share: totalTokens > 0 ? Math.round((value.tokens / totalTokens) * 100) : 0,
        }))
        .sort((a, b) => b.tokens - a.tokens),
      runtime,
    };
  }

  private async getRuntimeMetrics(
    companyId: string,
    currentMonthStart: Date,
  ): Promise<UsageSummary["runtime"]> {
    const [duration, resolvedConversations, handoffs] = await Promise.all([
      this.prisma.assistantRuntimeLog.aggregate({
        where: { companyId, createdAt: { gte: currentMonthStart }, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
      this.prisma.assistantRuntimeLog.count({
        where: {
          companyId,
          createdAt: { gte: currentMonthStart },
          outcome: "success",
          fallback: false,
        },
      }),
      this.prisma.assistantRuntimeLog.count({
        where: { companyId, createdAt: { gte: currentMonthStart }, outcome: "handoff" },
      }),
    ]);
    return {
      averageResponseMs: Math.round(duration._avg.durationMs ?? 0),
      resolvedConversations,
      handoffs,
    };
  }

  private emptySummary(now: Date, source: UsageSource, message: string): UsageSummary {
    return {
      source,
      message,
      generatedAt: now.toISOString(),
      currency: "USD",
      month: { totalTokens: 0, requests: 0, actualCost: 0, previousActualCost: 0 },
      dailyCosts: recentUtcDays(now, 14).map((date) => ({ date, cost: 0 })),
      byModel: [],
      runtime: { averageResponseMs: 0, resolvedConversations: 0, handoffs: 0 },
    };
  }

  private safeErrorCode(error: unknown): string {
    if (error && typeof error === "object" && "status" in error) {
      return `HTTP_${String((error as { status?: unknown }).status)}`;
    }
    return "OPENAI_USAGE_ERROR";
  }
}

function utcMonthStart(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function unixSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000);
}

function toUtcDate(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString().slice(0, 10);
}

function recentUtcDays(now: Date, count: number): string[] {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset),
    );
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function isCostResult(value: { object: string }): value is {
  object: "organization.costs.result";
  amount?: { value?: number };
} {
  return value.object === "organization.costs.result";
}

function isCompletionsResult(value: { object: string }): value is {
  object: "organization.usage.completions.result";
  input_tokens: number;
  output_tokens: number;
  input_audio_tokens?: number;
  output_audio_tokens?: number;
  num_model_requests: number;
  model?: string | null;
} {
  return value.object === "organization.usage.completions.result";
}
