import { spawn } from "node:child_process";
import process from "node:process";

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Comando ${command} ${args.join(" ")} falhou com code=${code} signal=${signal ?? "none"}`));
    });
  });
}

async function main() {
  const yes = process.argv.includes("--yes");
  const killArgs = ["run", yes ? "api:kill:yes" : "api:kill"];

  await runCommand("npm", killArgs, { cwd: process.cwd() });
  await runCommand("npm", ["run", "api:build"], { cwd: process.cwd() });
  await runCommand("npm", ["run", "api:start"], { cwd: process.cwd() });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
