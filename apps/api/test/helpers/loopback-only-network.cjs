"use strict";

const net = require("node:net");

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const originalFetch = globalThis.fetch;
const originalListen = net.Server.prototype.listen;
const harnessPort = Number(process.env.PORT);

if (typeof originalFetch !== "function") {
  throw new Error("HTTP harness requires the native fetch implementation");
}

if (!Number.isInteger(harnessPort) || harnessPort <= 0) {
  throw new Error("HTTP harness requires a positive integer PORT");
}

net.Server.prototype.listen = function loopbackOnlyListen(...args) {
  if (typeof args[0] === "object" && args[0] !== null) {
    if (Number(args[0].port) === harnessPort) {
      args[0] = { ...args[0], host: "127.0.0.1" };
    }
  } else if (Number(args[0]) === harnessPort) {
    if (typeof args[1] === "string") {
      if (!LOOPBACK_HOSTS.has(args[1])) {
        throw new Error(`HTTP harness refuses non-loopback listen host: ${args[1]}`);
      }
    } else {
      args.splice(1, 0, "127.0.0.1");
    }
  }
  return originalListen.apply(this, args);
};

globalThis.fetch = function loopbackOnlyFetch(input, init) {
  const rawUrl =
    typeof input === "string" || input instanceof URL
      ? String(input)
      : typeof input?.url === "string"
        ? input.url
        : "";
  const parsed = new URL(rawUrl);
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    const error = new Error(
      `HTTP_HARNESS_BLOCKED_NON_LOOPBACK_EGRESS:${parsed.protocol}//${parsed.hostname}`,
    );
    error.code = "HTTP_HARNESS_BLOCKED_NON_LOOPBACK_EGRESS";
    throw error;
  }
  return originalFetch.call(globalThis, input, init);
};

process.env.HTTP_HARNESS_EGRESS_POLICY = "loopback-only";
process.env.HTTP_HARNESS_LISTEN_POLICY = "loopback-only";
