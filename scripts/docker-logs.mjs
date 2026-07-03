import { spawnSync } from "node:child_process";
import process from "node:process";
import { ensureDockerReady } from "./docker-utils.mjs";

const dockerBinary = ensureDockerReady();
const result = spawnSync(
  dockerBinary,
  ["compose", "-f", "infra/docker-compose.local.yml", "logs", "-f"],
  {
    stdio: "inherit",
    shell: false,
  },
);

process.exit(result.status ?? 1);
