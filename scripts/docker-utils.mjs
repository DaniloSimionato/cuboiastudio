import fs from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const DOCKER_DESKTOP_BINARY = "/Applications/Docker.app/Contents/Resources/bin/docker";

export function commandExists(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], {
    stdio: "ignore",
    shell: false,
  });

  return result.status === 0;
}

export function isDockerDesktopRunning() {
  if (process.platform !== "darwin") {
    return true;
  }

  const result = spawnSync(
    "sh",
    ["-lc", `osascript -e 'application "Docker" is running' >/dev/null 2>&1`],
    {
      stdio: "ignore",
      shell: false,
    },
  );

  return result.status === 0;
}

export function resolveDockerBinary() {
  if (commandExists("docker")) {
    return "docker";
  }

  if (process.platform === "darwin" && fs.existsSync(DOCKER_DESKTOP_BINARY)) {
    return DOCKER_DESKTOP_BINARY;
  }

  return null;
}

function printDockerMissingMessage() {
  console.error("Docker CLI was not found.");
  console.error("");
  console.error("On macOS:");
  console.error("1. Open Docker Desktop.");
  console.error("2. Check if this command works:");
  console.error("   docker --version");
  console.error("3. If Docker Desktop is installed but docker is not in PATH, run:");
  console.error(
    "   sudo ln -sf /Applications/Docker.app/Contents/Resources/bin/docker /usr/local/bin/docker",
  );
  console.error("");
  console.error("Then run:");
  console.error("   npm run db:local:up");
}

export function ensureDockerReady() {
  const dockerBinary = resolveDockerBinary();

  if (!dockerBinary) {
    printDockerMissingMessage();
    process.exit(1);
  }

  if (!isDockerDesktopRunning()) {
    console.error("Docker Desktop is installed, but it does not seem to be running.");
    console.error(
      "Please open Docker Desktop and wait until it finishes starting, then try again.",
    );
    process.exit(1);
  }

  const composeCheck = spawnSync(dockerBinary, ["compose", "version"], {
    stdio: "ignore",
    shell: false,
  });
  if (composeCheck.status !== 0) {
    console.error("docker compose is not available.");
    console.error("Please update Docker Desktop and make sure the compose plugin is enabled.");
    process.exit(1);
  }

  return dockerBinary;
}
