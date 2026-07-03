#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";

function printUsage() {
  console.error("Uso: node scripts/replay-chatwoot-webhook.mjs <fixture.json>");
}

function truncate(text, maxLength = 500) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}

async function main() {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const baseUrl = (process.env.CHATWOOT_REPLAY_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const endpoint = process.env.CHATWOOT_REPLAY_ENDPOINT ?? "/webhooks/chatwoot";
  const secret = process.env.CHATWOOT_REPLAY_SECRET?.trim() ?? "";
  const useLegacyHeader = process.env.CHATWOOT_REPLAY_LEGACY_HEADER === "true";
  const requestId = process.env.CHATWOOT_REPLAY_REQUEST_ID?.trim() || randomUUID();
  const correlationId = process.env.CHATWOOT_REPLAY_CORRELATION_ID?.trim() || requestId;

  const absolutePath = path.isAbsolute(fixturePath) ? fixturePath : path.resolve(process.cwd(), fixturePath);
  const raw = await readFile(absolutePath, "utf8");
  const payload = JSON.parse(raw);

  const url = new URL(`${baseUrl}${endpoint}`);
  if (secret) {
    url.searchParams.set("secret", secret);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-correlation-id": correlationId,
      ...(useLegacyHeader && secret ? { "x-chatwoot-webhook-secret": secret } : {}),
    },
    body: JSON.stringify(payload),
  });

  const responseText = truncate(await response.text());
  console.log(JSON.stringify({
    ok: response.ok,
    status: response.status,
    requestId,
    correlationId,
    url: url.toString(),
    response: responseText,
  }, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
