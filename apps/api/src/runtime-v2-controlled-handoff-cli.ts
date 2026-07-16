import { PrismaClient } from "@prisma/client";
import { PrismaConversationStateStore } from "./runtime-v2/prisma-conversation-state-store";
import {
  RuntimeV2ControlledHandoffCommand,
  type ControlledHandoffCommandInput,
  type ControlledHandoffCommandMode,
} from "./runtime-v2/controlled-handoff-command";

type CliArguments = Omit<ControlledHandoffCommandInput, "mode"> & {
  mode: ControlledHandoffCommandMode;
};

function usage(): string {
  return [
    "runtime-v2-controlled-handoff",
    "--company-id <id>",
    "--assistant-id <id>",
    "--conversation-id <id>",
    "--context-version <number>",
    "--handoff-id <id>",
    "--expected-revision <number>",
    "[--mode DRY_RUN|EXECUTE]",
    "[--approval-id <id>]",
  ].join(" ");
}

export function parseControlledHandoffArguments(argv: string[]): CliArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--") || !argv[index + 1] || argv[index + 1].startsWith("--")) {
      throw new Error("CONTROLLED_HANDOFF_ARGUMENTS_INVALID");
    }
    values.set(token.slice(2), argv[index + 1]);
    index += 1;
  }

  const required = [
    "company-id",
    "assistant-id",
    "conversation-id",
    "context-version",
    "handoff-id",
    "expected-revision",
  ];
  if (required.some((key) => !values.get(key)?.trim())) {
    throw new Error("CONTROLLED_HANDOFF_ARGUMENTS_INVALID");
  }

  const mode = values.get("mode") ?? "DRY_RUN";
  if (mode !== "DRY_RUN" && mode !== "EXECUTE") {
    throw new Error("CONTROLLED_HANDOFF_MODE_INVALID");
  }
  const contextVersion = Number(values.get("context-version"));
  const expectedRevision = Number(values.get("expected-revision"));
  if (!Number.isInteger(contextVersion) || contextVersion < 1) {
    throw new Error("CONTROLLED_HANDOFF_CONTEXT_VERSION_INVALID");
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error("CONTROLLED_HANDOFF_REVISION_INVALID");
  }
  if (mode === "EXECUTE" && !values.get("approval-id")?.trim()) {
    throw new Error("CONTROLLED_HANDOFF_APPROVAL_REQUIRED");
  }

  return {
    companyId: values.get("company-id")!,
    assistantId: values.get("assistant-id")!,
    conversationId: values.get("conversation-id")!,
    contextVersion,
    handoffId: values.get("handoff-id")!,
    expectedRevision,
    mode,
    approvalId: values.get("approval-id") ?? null,
  };
}

export async function runControlledHandoffCli(argv = process.argv.slice(2)): Promise<void> {
  const prisma = new PrismaClient();
  try {
    if (argv.includes("--help")) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    const input = parseControlledHandoffArguments(argv);
    const stateStore = new PrismaConversationStateStore(prisma as never);
    const command = new RuntimeV2ControlledHandoffCommand({ stateStore });
    const result = await command.run(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.eligible && input.mode === "EXECUTE") process.exitCode = 2;
  } catch (error) {
    const code = error instanceof Error ? error.message : "CONTROLLED_HANDOFF_COMMAND_FAILED";
    process.stderr.write(`${JSON.stringify({ errorCode: code, redactionApplied: true })}\n`);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void runControlledHandoffCli();
}
