import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HANDOFF_RECOVERY_BATCH_LIMIT,
  DEFAULT_HANDOFF_RECOVERY_INTERVAL_MS,
  HandoffRecoveryRunner,
  resolveHandoffRecoveryRunnerConfiguration,
} from "../dist/assistant-conversations/handoff-recovery-runner.js";
import { validateEnvironment } from "../dist/config/env.js";

function configService(values = {}) {
  return {
    get(key) {
      return values[key];
    },
  };
}

test("handoff recovery environment defaults are conservative and disabled", () => {
  const environment = validateEnvironment({});

  assert.equal(environment.HANDOFF_RECOVERY_ENABLED, false);
  assert.equal(
    environment.HANDOFF_RECOVERY_INTERVAL_MS,
    DEFAULT_HANDOFF_RECOVERY_INTERVAL_MS,
  );
  assert.equal(
    environment.HANDOFF_RECOVERY_BATCH_LIMIT,
    DEFAULT_HANDOFF_RECOVERY_BATCH_LIMIT,
  );
  assert.equal(environment.HANDOFF_RECOVERY_LEASE_MS, 60_000);
  assert.equal(environment.HANDOFF_RECOVERY_MAX_MUTATION_ATTEMPTS, 3);
  assert.equal(environment.HANDOFF_RECOVERY_BACKOFF_BASE_MS, 60_000);
  assert.equal(environment.HANDOFF_RECOVERY_BACKOFF_CAP_MS, 3_600_000);
  assert.equal(environment.HANDOFF_RECOVERY_JITTER_RATIO, 0.1);
});

test("handoff recovery environment parses explicit controlled-test values", () => {
  const environment = validateEnvironment({
    NODE_ENV: "test",
    HANDOFF_RECOVERY_ENABLED: "true",
    HANDOFF_RECOVERY_INTERVAL_MS: "1200",
    HANDOFF_RECOVERY_BATCH_LIMIT: "4",
    HANDOFF_RECOVERY_LEASE_MS: "5000",
    HANDOFF_RECOVERY_MAX_MUTATION_ATTEMPTS: "2",
    HANDOFF_RECOVERY_BACKOFF_BASE_MS: "2000",
    HANDOFF_RECOVERY_BACKOFF_CAP_MS: "10000",
    HANDOFF_RECOVERY_JITTER_RATIO: "0.2",
  });

  assert.equal(environment.HANDOFF_RECOVERY_ENABLED, true);
  assert.equal(environment.HANDOFF_RECOVERY_INTERVAL_MS, 1200);
  assert.equal(environment.HANDOFF_RECOVERY_BATCH_LIMIT, 4);
  assert.equal(environment.HANDOFF_RECOVERY_LEASE_MS, 5000);
  assert.equal(environment.HANDOFF_RECOVERY_MAX_MUTATION_ATTEMPTS, 2);
  assert.equal(environment.HANDOFF_RECOVERY_BACKOFF_BASE_MS, 2000);
  assert.equal(environment.HANDOFF_RECOVERY_BACKOFF_CAP_MS, 10000);
  assert.equal(environment.HANDOFF_RECOVERY_JITTER_RATIO, 0.2);
});

test("runner remains inert when the feature flag is off", async () => {
  let calls = 0;
  const runner = new HandoffRecoveryRunner(
    configService({ NODE_ENV: "test", HANDOFF_RECOVERY_ENABLED: false }),
    {
      async runHandoffRecoveryOnce() {
        calls += 1;
      },
    },
  );

  runner.onApplicationBootstrap();
  assert.equal(runner.isScheduled(), false);
  assert.equal(await runner.runOnce(), "DISABLED");
  assert.equal(calls, 0);
  await runner.onApplicationShutdown();
});

for (const environment of ["staging", "production"]) {
  test(`runner is fail-closed in ${environment} even when enabled`, async () => {
    let calls = 0;
    const configuration = resolveHandoffRecoveryRunnerConfiguration(
      configService({
        NODE_ENV: environment,
        HANDOFF_RECOVERY_ENABLED: true,
      }),
    );
    assert.equal(configuration.automaticExecutionAllowed, false);

    const runner = new HandoffRecoveryRunner(
      configService({
        NODE_ENV: environment,
        HANDOFF_RECOVERY_ENABLED: true,
      }),
      {
        async runHandoffRecoveryOnce() {
          calls += 1;
        },
      },
    );
    runner.onApplicationBootstrap();
    assert.equal(runner.isScheduled(), false);
    assert.equal(await runner.runOnce(), "BLOCKED_ENVIRONMENT");
    assert.equal(calls, 0);
    await runner.onApplicationShutdown();
  });
}

test("enabled runner schedules cleanly and forwards only the configured batch limit", async () => {
  const calls = [];
  const runner = new HandoffRecoveryRunner(
    configService({
      NODE_ENV: "test",
      HANDOFF_RECOVERY_ENABLED: true,
      HANDOFF_RECOVERY_INTERVAL_MS: 60_000,
      HANDOFF_RECOVERY_BATCH_LIMIT: 7,
    }),
    {
      async runHandoffRecoveryOnce(input) {
        calls.push(input);
      },
    },
  );

  runner.onApplicationBootstrap();
  assert.equal(runner.isScheduled(), true);
  assert.equal(await runner.runOnce(), "COMPLETED");
  assert.deepEqual(calls, [{ limit: 7 }]);
  await runner.onApplicationShutdown();
  assert.equal(runner.isScheduled(), false);
  assert.equal(await runner.runOnce(), "SHUTTING_DOWN");
});

test("runner prevents overlap and shutdown waits for the active execution", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const runner = new HandoffRecoveryRunner(
    configService({
      NODE_ENV: "test",
      HANDOFF_RECOVERY_ENABLED: true,
      HANDOFF_RECOVERY_BATCH_LIMIT: 3,
    }),
    {
      async runHandoffRecoveryOnce() {
        calls += 1;
        await gate;
      },
    },
  );

  const firstRun = runner.runOnce();
  assert.equal(await runner.runOnce(), "SKIPPED_OVERLAP");
  assert.equal(calls, 1);

  let shutdownCompleted = false;
  const shutdown = runner.onApplicationShutdown().then(() => {
    shutdownCompleted = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shutdownCompleted, false);

  release();
  assert.equal(await firstRun, "COMPLETED");
  await shutdown;
  assert.equal(shutdownCompleted, true);
});

test("runner contains coordinator failures and remains available for a later tick", async () => {
  let calls = 0;
  const runner = new HandoffRecoveryRunner(
    configService({
      NODE_ENV: "test",
      HANDOFF_RECOVERY_ENABLED: true,
    }),
    {
      async runHandoffRecoveryOnce() {
        calls += 1;
        if (calls === 1) throw new Error("controlled failure");
      },
    },
  );

  assert.equal(await runner.runOnce(), "FAILED");
  assert.equal(await runner.runOnce(), "COMPLETED");
  assert.equal(calls, 2);
  await runner.onApplicationShutdown();
});
