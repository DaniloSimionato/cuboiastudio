# Production HTTP harness — policy blocks 0–3B.1

This harness originated against deployed baseline
`02f3ccc61f320f87c06ff50d2f7ba809e08cc4ad`. Its current Block 3B.1 scope is
anchored at approved Block 3A commit
`d22a1dd75dfbbf20c6316f23a9c08ae03eed2361`. It characterizes behavior while
durable outbound identity, state and single-attempt ownership are introduced;
it does not authorize functional response changes, automatic retry or external
reconciliation.

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
host-aware bootstrap would require a forbidden production-code change.

## Isolated services

`npm run test:http-harness` creates two uniquely named, disposable containers:

- `pgvector/pgvector:pg16`, with a unique
  `cubo_policy_block0_test_*` database and random loopback port;
- `redis:7-alpine`, without persistence and with a random loopback port.

Only repository migrations are applied with `prisma migrate deploy`. Before the
fresh database run, the runner also creates a separate local database, applies
the approved Block 3A migrations, inserts a minimal baseline fixture and then
applies the Block 3B.1 migration. It validates defaults, foreign keys and both
outbound uniqueness constraints. The runner fails closed if either URL is
non-loopback, if a database name is outside the harness namespace, if the
approved Block 3A commit is not an ancestor of `HEAD`, or if production source,
schema or migration changes exceed the explicit Block 3B.1 allowlist. Teardown
removes only containers created by that runner invocation.

## Stateful boundaries

The Chatwoot fake records sanitized method, path, headers, body, order,
timestamp and configured response. It keeps conversation state (`ai_active`,
status, assignee, team, labels and messages), returns external message IDs, and
supports accepted, 4xx, 5xx and accepted-but-response-ambiguous timeout
behavior.

The OpenAI-compatible fake records embeddings, intent classification, final
generation, memory extraction, exposed tools and returned tool calls
separately. Responses are configurable per category. Both fakes listen only on
`127.0.0.1` and never access the internet.

## Executable coverage and limits

The runner currently declares nineteen Node tests: fourteen executable
scenarios (A–N) and five future specifications marked `test.todo`. Scenarios
A–F retain the Block 0–2 controls. G–I retain the Block 3A concurrency and
stale-control controls. The Block 3B.1 assertions prove one durable delivery
per decision block, `ACKNOWLEDGED` after a successful Chatwoot response,
delivery reuse after duplicate, atomic claim ownership, `CANCELLED_STALE`,
`FAILED_TERMINAL` for 4xx, `FAILED_RETRYABLE` for 5xx, `UNCERTAIN` after an
accepted-but-ambiguous timeout, and persistence of both `ACKNOWLEDGED` and
`PENDING` across application restart without automatic recovery. Runtime V2
OFF is a transversal invariant asserted inside every executable scenario, not
an additional executable scenario.

Every applicable executable scenario verifies the sealed V1 decision owner
added in Block 2 and the accepted local control revision added in Block 3A.
Provider draft ownership, manifest sanitization, checkpoints and the single
terminal executor are asserted within those controls rather than through
duplicate artificial scenarios.

The fixtures deliberately disable message buffering, memory and response
splitting to keep lifecycle and outbound counts deterministic. Therefore this
harness does not yet validate concurrent buffering. It also does not reproduce
every possible production condition; it validates the named controls through
the production bootstrap and central services while Chatwoot and the provider
remain fake HTTP boundaries.

PostgreSQL remains the operational authority for local checkpoints. A remote
Chatwoot pause that is not reflected locally remains undetectable here; no
additional remote reads or polling were introduced. The harness also does not
claim automatic retry, lease recovery or external reconciliation coverage.
`PENDING`, `SENDING`, `FAILED_RETRYABLE` and `UNCERTAIN` remain durable for a
future policy; no worker is started.

## Lifecycle and build evidence

The runner:

1. starts and health-checks isolated PostgreSQL and Redis;
2. generates Prisma Client and applies existing migrations;
3. performs a fresh TypeScript build;
4. records the SHA-256 and timestamp of `dist/main.js` plus
   `dist/app.module.js` and the instrumented V1
   decision/manifest/control/outbound-delivery/runtime artifacts;
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

## Current delivery limits

The dedupe control proves one logical processing, one final generation, one
durable delivery, one claim and one outbound for two deliveries of the same
external message ID. A Chatwoot success is recorded as `ACKNOWLEDGED`, never as
proof of end-user delivery. A duplicate does not retry `PENDING`,
`FAILED_RETRYABLE`, `SENDING` or `UNCERTAIN`. Recovery of abandoned claims,
retry and reconciliation are deliberately deferred to Block 3B.2.
