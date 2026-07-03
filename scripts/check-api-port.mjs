import { getListeningProcesses, resolvePort } from "./api-port-utils.mjs";

try {
  const port = resolvePort();
  const processes = getListeningProcesses(port);

  if (processes.length === 0) {
    console.log(`Porta ${port} livre.`);
    process.exit(0);
  }

  console.log(`Porta ${port} em uso por:`);
  for (const processInfo of processes) {
    console.log(`- ${processInfo.command || "unknown"} (PID ${processInfo.pid}) - ${processInfo.name || `tcp:${port}`}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
