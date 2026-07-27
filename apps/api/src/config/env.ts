import { z } from "zod";

const optionalText = z.string().trim().optional().default("");
const booleanEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      return false;
    }

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return false;
}, z.boolean());

export const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  AUTH_TRUST_MODE: z.enum(["off", "signed-headers"]).default("off"),
  AUTH_PROXY_SHARED_SECRET: optionalText,
  AUTH_PROXY_SIGNATURE_TTL_MS: z.coerce.number().int().positive().optional().default(300_000),
  AI_RUNTIME_ENABLED: booleanEnv.default(false),
  AI_PROVIDER: z.string().trim().optional().default("openai-compatible"),
  AI_BASE_URL: optionalText,
  AI_MODEL: optionalText,
  AI_API_KEY: optionalText,
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional().default(30_000),
  ASSISTANT_KNOWLEDGE_MIN_SCORE_OVERRIDES: optionalText,
  KNOWLEDGE_SCOPE_TAG_FILTER_ASSISTANT_IDS: optionalText,
  APP_ENCRYPTION_KEY: optionalText,
  DATABASE_URL: optionalText,
  REDIS_URL: optionalText,
  JWT_SECRET: optionalText,
  OPENAI_API_KEY: optionalText,
  ANTHROPIC_API_KEY: optionalText,
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  GOOGLE_CALENDAR_REDIRECT_URI: optionalText,
  CHATWOOT_URL: optionalText,
  CHATWOOT_TOKEN: optionalText,
  CHATWOOT_ALLOW_INSECURE_WEBHOOKS: booleanEnv.default(false),
  CHATWOOT_ATTACHMENT_DOWNLOAD_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(15_000),
  CHATWOOT_ATTACHMENT_MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(10 * 1024 * 1024),
  CHATWOOT_ATTACHMENT_MAX_AUDIO_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(20 * 1024 * 1024),
  CHATWOOT_ATTACHMENT_MAX_VIDEO_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(20 * 1024 * 1024),
  CHATWOOT_ATTACHMENT_MAX_DOCUMENT_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(15 * 1024 * 1024),
  HANDOFF_RECOVERY_ENABLED: booleanEnv.default(false),
  HANDOFF_RECOVERY_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .optional()
    .default(60_000),
  HANDOFF_RECOVERY_BATCH_LIMIT: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25),
  HANDOFF_RECOVERY_LEASE_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(600_000)
    .optional()
    .default(60_000),
  HANDOFF_RECOVERY_MAX_MUTATION_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(3),
  HANDOFF_RECOVERY_BACKOFF_BASE_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .optional()
    .default(60_000),
  HANDOFF_RECOVERY_BACKOFF_CAP_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(86_400_000)
    .optional()
    .default(3_600_000),
  HANDOFF_RECOVERY_JITTER_RATIO: z.coerce
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .default(0.1),
  CORS_ORIGIN: z.string().trim().optional(),
});

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(input: NodeJS.ProcessEnv): EnvironmentVariables {
  const parsed = environmentSchema.safeParse(input);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment variables: ${issues.join(", ")}`);
  }

  return parsed.data;
}
