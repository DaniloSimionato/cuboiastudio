import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AssistantSecurityRulesService } from "./assistant-security-rules/assistant-security-rules.service";
import { PrismaService } from "./database/prisma.service";
import { ConversationStateResponseExecutionStore } from "./runtime-v2/conversation-state-response-execution-store";
import { PrismaConversationStateStore } from "./runtime-v2/prisma-conversation-state-store";
import { RuntimeV2ResponseExecutionAdministrationService } from "./runtime-v2/response-execution-administration";
import { RuntimeV2ResponseExecutionCoordinator } from "./runtime-v2/response-execution-coordinator";

type Command = "preflight" | "arm" | "status" | "cancel";

type ParsedArguments = {
  command: Command;
  companyId?: string;
  assistantId?: string;
  conversationId?: string;
  message?: string;
  canonicalVersion?: string;
  category?: string;
  authority?: string;
  durationMinutes?: number;
  operatorPurpose?: string;
  approvalFingerprint?: string;
};

function usage(): string {
  return [
    "runtime-v2-response-execution <preflight|arm|status|cancel>",
    "--company-id <id> --assistant-id <id> --conversation-id <id>",
    "preflight|arm: --message <future-message> --canonical-version <version>",
    "--category businessHours --authority OFFICIAL_CONTEXT",
    "arm: --duration-minutes <1-10> --operator-purpose <purpose>",
    "status|cancel: --approval-fingerprint <fingerprint>",
  ].join(" ");
}

function requireValue(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim();
  if (!value) throw new Error("RESPONSE_EXECUTION_CLI_ARGUMENTS_INVALID");
  return value;
}

export function parseRuntimeV2ResponseExecutionArguments(argv: string[]): ParsedArguments {
  if (argv.length === 0 || argv[0] === "--help") throw new Error("RESPONSE_EXECUTION_CLI_USAGE");
  const command = argv[0];
  if (!(["preflight", "arm", "status", "cancel"] as const).includes(command as Command)) {
    throw new Error("RESPONSE_EXECUTION_CLI_COMMAND_INVALID");
  }
  const values = new Map<string, string>();
  for (let index = 1; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error("RESPONSE_EXECUTION_CLI_ARGUMENTS_INVALID");
    }
    values.set(key.slice(2), value);
    index += 1;
  }
  const result: ParsedArguments = {
    command: command as Command,
    companyId: requireValue(values, "company-id"),
    assistantId: requireValue(values, "assistant-id"),
    conversationId: requireValue(values, "conversation-id"),
    approvalFingerprint: values.get("approval-fingerprint")?.trim(),
  };
  if (result.command === "preflight" || result.command === "arm") {
    result.message = requireValue(values, "message");
    result.canonicalVersion = requireValue(values, "canonical-version");
    result.category = requireValue(values, "category");
    result.authority = requireValue(values, "authority");
    if (result.category !== "businessHours" || result.authority !== "OFFICIAL_CONTEXT") {
      throw new Error("RESPONSE_EXECUTION_CLI_CATEGORY_OR_AUTHORITY_INVALID");
    }
  }
  if (result.command === "arm") {
    result.operatorPurpose = requireValue(values, "operator-purpose");
    result.durationMinutes = Number(requireValue(values, "duration-minutes"));
    if (
      !Number.isInteger(result.durationMinutes) ||
      result.durationMinutes < 1 ||
      result.durationMinutes > 10
    ) {
      throw new Error("RESPONSE_EXECUTION_CLI_DURATION_INVALID");
    }
  }
  if ((result.command === "status" || result.command === "cancel") && !result.approvalFingerprint) {
    throw new Error("RESPONSE_EXECUTION_CLI_APPROVAL_FINGERPRINT_REQUIRED");
  }
  return result;
}

function redactOutput(value: unknown): string {
  return JSON.stringify(value);
}

export async function runRuntimeV2ResponseExecutionCli(
  argv = process.argv.slice(2),
): Promise<void> {
  if (argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  let app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | null = null;
  try {
    const input = parseRuntimeV2ResponseExecutionArguments(argv);
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const administration = new RuntimeV2ResponseExecutionAdministrationService({
      prisma: app.get(PrismaService),
      securityRules: app.get(AssistantSecurityRulesService),
      stateStore: app.get(PrismaConversationStateStore),
      responseExecutionStore: app.get(ConversationStateResponseExecutionStore),
      coordinator: app.get(RuntimeV2ResponseExecutionCoordinator),
    });
    const scope = {
      companyId: input.companyId!,
      assistantId: input.assistantId!,
      conversationId: input.conversationId!,
    };
    const result =
      input.command === "preflight"
        ? await administration.preflight({
            ...scope,
            message: input.message!,
            canonicalVersion: input.canonicalVersion!,
            allowedCategory: "businessHours",
            allowedAuthority: "OFFICIAL_CONTEXT",
          })
        : input.command === "arm"
          ? await administration.arm({
              ...scope,
              message: input.message!,
              canonicalVersion: input.canonicalVersion!,
              allowedCategory: "businessHours",
              allowedAuthority: "OFFICIAL_CONTEXT",
              durationMinutes: input.durationMinutes!,
              operatorPurpose: input.operatorPurpose!,
            })
          : input.command === "status"
            ? await administration.status({
                ...scope,
                approvalFingerprint: input.approvalFingerprint,
              })
            : await administration.cancel({
                ...scope,
                approvalFingerprint: input.approvalFingerprint!,
              });
    process.stdout.write(`${redactOutput(result)}\n`);
    if ("preflightStatus" in result && result.preflightStatus !== "APPROVED") process.exitCode = 2;
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "RESPONSE_EXECUTION_CLI_FAILED";
    process.stderr.write(`${JSON.stringify({ errorCode, redactionApplied: true })}\n`);
    process.exitCode = 2;
  } finally {
    await app?.close();
  }
}

if (require.main === module) {
  void runRuntimeV2ResponseExecutionCli();
}
