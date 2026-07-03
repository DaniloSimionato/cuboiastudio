import { execFileSync, spawnSync } from "node:child_process";

function resolvePort() {
  const raw = process.env.PORT?.trim();
  const port = raw ? Number(raw) : 3001;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT inválida: ${process.env.PORT ?? ""}`);
  }

  return port;
}

function runLsof(args) {
  const result = spawnSync("lsof", args, { encoding: "utf8" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr.trim() || "Falha ao consultar processos da porta.");
  }

  return result.stdout.trim();
}

function parseLsofRecords(output) {
  const records = [];
  let current = null;

  for (const line of output.split("\n")) {
    if (!line) {
      continue;
    }

    const prefix = line[0];
    const value = line.slice(1);

    if (prefix === "p") {
      if (current) {
        records.push(current);
      }
      current = { pid: value, command: "", name: "" };
      continue;
    }

    if (!current) {
      continue;
    }

    if (prefix === "c") {
      current.command = value;
    } else if (prefix === "n") {
      current.name = value;
    }
  }

  if (current) {
    records.push(current);
  }

  return records;
}

function getListeningProcesses(port) {
  const output = runLsof(["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpcn"]);
  return parseLsofRecords(output).filter((record) => record.pid);
}

function formatProcess(record) {
  return `PID ${record.pid} | ${record.command || "unknown"} | ${record.name || `tcp:${record.pid}`}`;
}

export { formatProcess, getListeningProcesses, resolvePort };
