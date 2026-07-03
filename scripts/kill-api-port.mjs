import { createInterface } from "node:readline/promises";
import process from "node:process";
import { spawn } from "node:child_process";
import { formatProcess, getListeningProcesses, resolvePort } from "./api-port-utils.mjs";

function hasYesFlag() {
  return process.argv.includes("--yes");
}

async function confirm(message) {
  if (!process.stdin.isTTY) {
    return false;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${message} [y/N] `);
    return ["y", "yes"].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

async function waitForExit(pid, timeoutMs = 2500) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
}

async function terminateProcess(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ESRCH") {
      return true;
    }

    throw error;
  }

  if (await waitForExit(pid)) {
    return true;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ESRCH") {
      return true;
    }

    throw error;
  }

  return waitForExit(pid, 1500);
}

try {
  const port = resolvePort();
  const processes = getListeningProcesses(port);

  if (processes.length === 0) {
    console.log(`Nenhum processo usando a porta ${port}.`);
    process.exit(0);
  }

  console.log(`Processos na porta ${port}:`);
  for (const processInfo of processes) {
    console.log(`- ${formatProcess(processInfo)}`);
  }

  if (!hasYesFlag()) {
    const shouldKill = await confirm(`Encerrar os processos da porta ${port}?`);
    if (!shouldKill) {
      console.log("Operação cancelada.");
      process.exit(0);
    }
  }

  for (const processInfo of processes) {
    const killed = await terminateProcess(Number(processInfo.pid));
    if (killed) {
      console.log(`Processo PID ${processInfo.pid} encerrado.`);
    } else {
      console.log(`Processo PID ${processInfo.pid} não encerrou no tempo esperado.`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
