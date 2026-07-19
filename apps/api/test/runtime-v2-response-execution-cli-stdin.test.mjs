import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { PrismaClient } from "@prisma/client";
import { hashCanonicalInboundMessageContent } from "../dist/inbound/canonical-inbound-message.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}

const prisma = new PrismaClient();
const prefix = `runtime-v2-cli-stdin-${randomUUID()}`;
const scope = {
  companyId: `${prefix}-company`,
  assistantId: `${prefix}-assistant`,
  conversationId: `${prefix}-conversation`,
};
const canonicalVersion = "canonical-inbound-message-v1";
const fixtureMessage = "Qual é o horário de atendimento de segunda a sexta?";

function runCli(args, stdin) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/runtime-v2-response-execution.mjs", ...args], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        RUNTIME_V2_RESPONSE_EXECUTION_MODE: "OFF",
        RUNTIME_V2_RESPONSE_EXECUTION_ASSISTANT_IDS: "",
        RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_IDS: "",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(stdin);
  });
}

async function createFixture() {
  await prisma.company.create({ data: { id: scope.companyId, name: "CLI stdin company" } });
  await prisma.assistant.create({
    data: {
      id: scope.assistantId,
      companyId: scope.companyId,
      name: "CLI stdin assistant",
      timezone: "America/Sao_Paulo",
      weeklySchedule: {
        monday: [{ start: "08:00", end: "18:00" }],
        tuesday: [{ start: "08:00", end: "18:00" }],
        wednesday: [{ start: "08:00", end: "18:00" }],
        thursday: [{ start: "08:00", end: "18:00" }],
        friday: [{ start: "08:00", end: "18:00" }],
        saturday: [],
        sunday: [],
      },
    },
  });
  await prisma.assistantConversation.create({
    data: {
      id: scope.conversationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      source: "SMOKE",
      currentContextVersion: 1,
    },
  });
}

function command(command, additional = []) {
  return [
    command,
    "--company-id",
    scope.companyId,
    "--assistant-id",
    scope.assistantId,
    "--conversation-id",
    scope.conversationId,
    "--message-stdin",
    "--canonical-version",
    canonicalVersion,
    "--category",
    "businessHours",
    "--authority",
    "OFFICIAL_CONTEXT",
    ...additional,
  ];
}

function scopedCommand(command, additional = []) {
  return [
    command,
    "--company-id",
    scope.companyId,
    "--assistant-id",
    scope.assistantId,
    "--conversation-id",
    scope.conversationId,
    ...additional,
  ];
}

function parseCliResult(output, requiredKey) {
  const result = output
    .trim()
    .split("\n")
    .reverse()
    .flatMap((candidate) => {
      try {
        return [JSON.parse(candidate)];
      } catch {
        return [];
      }
    })
    .find(
      (candidate) =>
        candidate && typeof candidate === "object" && Object.hasOwn(candidate, requiredKey),
    );
  assert.ok(result, "CLI did not emit its expected JSON result");
  return result;
}

function assertArmMatchesStatus(armed, status) {
  for (const field of [
    "approvalFingerprint",
    "executionFingerprint",
    "attemptNumber",
    "historyCount",
    "canonicalHashFingerprint",
    "canonicalVersion",
    "allowedCategory",
    "allowedAuthority",
    "status",
    "activeExecution",
    "canArmNewResponseExecution",
  ]) {
    assert.equal(armed[field], status[field], `CLI arm/status mismatch for ${field}`);
  }
}

after(async () => {
  await prisma.assistantConversationStateV2Event.deleteMany({
    where: { companyId: scope.companyId },
  });
  await prisma.assistantConversationStateV2.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.assistantConversation.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.assistant.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.company.deleteMany({ where: { id: scope.companyId } });
  await prisma.$disconnect();
});

test("CLI real via stdin mantém o hash do preflight no arm e não persiste a mensagem", async () => {
  await createFixture();
  const preflight = await runCli(command("preflight"), `${fixtureMessage}\r\n`);
  assert.equal(preflight.code, 0);
  assert.equal(preflight.stderr, "");
  assert.equal(preflight.stdout.includes(fixtureMessage), false);
  const preflightResult = parseCliResult(preflight.stdout, "preflightStatus");
  assert.equal(preflightResult.preflightStatus, "APPROVED");
  assert.equal(preflightResult.canonicalHashFingerprint, "f2432202f1b28ebd");

  const arm = await runCli(
    command("arm", ["--duration-minutes", "2", "--operator-purpose", "CLI stdin hash alignment"]),
    `${fixtureMessage}\n`,
  );
  assert.equal(arm.code, 0, arm.stderr);
  assert.equal(arm.stderr, "");
  assert.equal(arm.stdout.includes(fixtureMessage), false);
  const armResult = parseCliResult(arm.stdout, "status");
  assert.equal(armResult.status, "ARMED");
  assert.equal(armResult.historyCount, 0);
  const armedStatus = await runCli(
    scopedCommand("status", ["--approval-fingerprint", armResult.approvalFingerprint]),
    "",
  );
  assert.equal(armedStatus.code, 0, armedStatus.stderr);
  assertArmMatchesStatus(armResult, parseCliResult(armedStatus.stdout, "status"));

  const state = await prisma.assistantConversationStateV2.findFirst({
    where: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
    },
    select: { stateJson: true },
  });
  const execution = state?.stateJson?.responseExecution?.current;
  assert.equal(
    execution?.approval?.expectedCanonicalComparisonHash,
    hashCanonicalInboundMessageContent(fixtureMessage),
  );
  assert.equal(JSON.stringify(execution).includes(fixtureMessage), false);

  const cancel = await runCli(
    scopedCommand("cancel", ["--approval-fingerprint", armResult.approvalFingerprint]),
    "",
  );
  assert.equal(cancel.code, 0, cancel.stderr);
  assert.equal(parseCliResult(cancel.stdout, "status").status, "CANCELLED");

  const rearm = await runCli(
    command("arm", ["--duration-minutes", "2", "--operator-purpose", "CLI terminal rearm"]),
    fixtureMessage,
  );
  assert.equal(rearm.code, 0, rearm.stderr);
  const rearmResult = parseCliResult(rearm.stdout, "status");
  assert.equal(rearmResult.status, "ARMED");
  assert.equal(rearmResult.attemptNumber, 2);
  assert.equal(rearmResult.historyCount, 1);
  const rearmedStatus = await runCli(
    scopedCommand("status", ["--approval-fingerprint", rearmResult.approvalFingerprint]),
    "",
  );
  assert.equal(rearmedStatus.code, 0, rearmedStatus.stderr);
  assertArmMatchesStatus(rearmResult, parseCliResult(rearmedStatus.stdout, "status"));
  const rearmedState = await prisma.assistantConversationStateV2.findFirst({
    where: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
    },
    select: { stateJson: true },
  });
  const attempts = rearmedState?.stateJson?.responseExecution;
  assert.equal(attempts?.history?.length, 1);
  assert.equal(attempts?.history?.[0]?.approval?.status, "CANCELLED");
  assert.equal(
    attempts?.current?.approval?.expectedCanonicalComparisonHash,
    execution.approval.expectedCanonicalComparisonHash,
  );
});
