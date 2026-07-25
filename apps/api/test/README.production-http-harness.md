# Production HTTP harness — policy blocks 0–3B.2

This harness originated against deployed baseline
`02f3ccc61f320f87c06ff50d2f7ba809e08cc4ad`. Its current Block 3B.2 scope is
anchored at approved Block 3B.1 commit
`fcdfb15b1f4763ad4d6b0e0a2fd7690921471bcd`. It characterizes behavior while
safe outbound recovery and bounded reconciliation are introduced. It does not
authorize functional response changes or activate an automatic recovery
scheduler.

## Production-equivalent path

The test runner builds the API and starts the freshly generated `dist/main.js`
as a child process. This executes the real `main.ts` bootstrap, including the
real `AppModule`, logger, shutdown hooks, CORS/OPTIONS handling, global
`ValidationPipe`, exception filter and Swagger setup. Tests then issue HTTP
requests to `POST /webhooks/chatwoot`.

No Nest provider is overridden. Prisma, Redis cache, webhook normalization,
binding resolution, conversation runtime, Intent Router, Flow Router, RAG,
Prompt Compiler, guards, persistence and the V1 sender are all production
implementations.

The child process uses a temporary empty working directory so `ConfigModule`
cannot discover a repository `.env`. A test-only preload rejects every
non-loopback `fetch` and constrains the production listener for the randomly
selected test port to `127.0.0.1`. This is the only bootstrap difference:
production `main.ts` accepts a port but not a listen host, and exporting a
host-aware bootstrap would require a production-code change outside the
harness.

## Isolated services and migrations

`npm run test:http-harness` creates two uniquely named, disposable containers:

- `pgvector/pgvector:pg16`, with a unique
  `cubo_policy_block0_test_*` database and random loopback port;
- `redis:7-alpine`, without persistence and with a random loopback port.

Only repository migrations are applied with `prisma migrate deploy`. Before the
fresh database run, the runner creates a second local database, applies every
migration through the approved Block 3B.1 schema, inserts a minimal 3B.1
delivery, and then applies the Block 3B.2 migration. It validates historical
defaults, attempt defaults, foreign keys, cascade behavior and per-delivery
attempt uniqueness.

The runner fails closed if either URL is non-loopback, if a database name is
outside the harness namespace, if the approved Block 3B.1 commit is not an
ancestor of `HEAD`, or if production source, schema or migration changes exceed
the explicit Block 3B.2 allowlist. Teardown removes only containers created by
that runner invocation.

## Stateful boundaries

The Chatwoot fake records sanitized method, path, headers, body, order,
timestamp and configured response. It keeps conversation state (`ai_active`,
status, assignee, team, labels and messages), returns external message IDs, and
supports accepted, 4xx, 5xx without a remote effect, 5xx after a remote effect,
and accepted-but-response-ambiguous timeout behavior. The latter two preserve
the technical outbound reference so reconciliation can prove that the remote
message exists without resending it.

The OpenAI-compatible fake records embeddings, intent classification, final
generation, memory extraction, exposed tools and returned tool calls
separately. Responses are configurable per category. Both fakes listen only on
`127.0.0.1` and never access the internet.

## Executable coverage

The production-entrypoint suite declares nineteen Node tests: fourteen
executable scenarios (A–N) and five future specifications marked `test.todo`.
Scenarios A–F retain the Block 0–2 controls. G–I retain the Block 3A
concurrency and stale-control controls. J–N retain the durable ledger controls
while applying the corrected distinction between HTTP failure and
proven-safe retry: a generic 5xx is `UNCERTAIN` and requires reconciliation.
Runtime V2 OFF is a transversal invariant asserted inside every executable
scenario, not an additional executable scenario.

A separate integration-with-database recovery suite covers the coordinator
through real Prisma persistence and the fake HTTP boundary. It exercises
recovery of `PENDING`, recovery of `FAILED_RETRYABLE + PROVEN_SAFE`, refusal of
unknown-safety retries, 5xx and timeout with remote effects, restoration after
local finalization failure, leases before and after the boundary, two workers,
stale control, attempt budget, deterministic backoff, restart states,
sanitization and the legacy handoff path. It never recreates a decision,
assistant message or provider call.

Every applicable executable scenario verifies the sealed V1 decision owner
added in Block 2 and the accepted local control revision added in Block 3A.
Provider draft ownership, manifest sanitization, checkpoints and the single
terminal executor are asserted within those controls rather than through
duplicate artificial scenarios.

## Deliberate limits

The production HTTP fixtures deliberately disable message buffering, memory
and response splitting to keep lifecycle and outbound counts deterministic.
Therefore this harness does not validate concurrent buffering. Recovery accepts
only a single-block payload whose persisted terminal content is sufficient to
rebuild the existing Chatwoot text request; older or split payload contracts
remain visible but blocked from automatic recovery.

The harness does not reproduce every possible production condition. It
validates the named controls through the production bootstrap and central
services while Chatwoot and the provider remain fake HTTP boundaries.

PostgreSQL remains the operational authority for local checkpoints. A remote
Chatwoot pause that is not reflected locally remains undetectable here.
Recovery can perform a read-only Chatwoot conversation-message lookup for an
exact technical delivery reference. Finding that reference is conclusive;
absence from a paginated response is deliberately inconclusive and never
authorizes a retry. The repository provides no proven remote idempotency-key
contract or conclusive absence query.

No worker, cron, interval, startup recovery, endpoint or administrative route
is created or activated. The coordinator is directly callable in controlled
tests and by future internal scheduling only. Consequently this block proves
recovery semantics without enabling recovery in staging or production.

## Lifecycle and build evidence

The runner:

1. starts and health-checks isolated PostgreSQL and Redis;
2. generates Prisma Client and applies existing migrations;
3. performs a fresh TypeScript build;
4. records the SHA-256 and timestamp of `dist/main.js` plus
   `dist/app.module.js` and the instrumented V1
   decision/manifest/control/outbound-delivery/recovery/runtime artifacts;
5. starts both fakes and the production bootstrap;
6. waits for `/health`;
7. runs the HTTP tests serially;
8. stops the API with `SIGTERM`, allowing Nest lifecycle hooks to disconnect
   Prisma and Redis;
9. closes test clients and fakes, verifies their ports are closed, and removes
   the two owned containers.

## Visible future gaps

Five `test.todo` specifications intentionally remain non-blocking:

1. typo-tolerant deterministic BusinessHours;
2. multi-turn price continuity from formatting to motherboard repair;
3. full evidence beyond character 250;
4. useful and commercially complete handling of a slow computer;
5. operational, state-confirmed human handoff.

They state the future contract and never assert the currently incorrect
response as accepted behavior.

## Current delivery contract

The dedupe control proves one logical processing, one final generation, one
durable delivery, one claim and one outbound for two deliveries of the same
external message ID. A Chatwoot success is recorded as `ACKNOWLEDGED`, never as
proof of end-user delivery. A duplicate does not call the coordinator or retry
any delivery state.

`PENDING` and `FAILED_RETRYABLE + PROVEN_SAFE` are the only send-eligible
recovery states, subject to current control, budget and backoff. `UNCERTAIN`
never sends directly. An expired `SENDING` claim becomes retryable only when
its attempt proves the HTTP boundary was not entered; otherwise it becomes
uncertain. The default budget is three attempts, the lease is finite, and
backoff includes deterministic bounded jitter. These defaults are domain
constants in this block; runtime configuration and automatic activation remain
future operational decisions.
