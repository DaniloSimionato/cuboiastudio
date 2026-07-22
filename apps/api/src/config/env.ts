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
