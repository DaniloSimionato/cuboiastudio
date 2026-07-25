# Production HTTP harness — policy blocks 0–4A

This harness originated against deployed baseline
`02f3ccc61f320f87c06ff50d2f7ba809e08cc4ad`. Its current Block 4A scope is
anchored at approved, documentation-sanitized Block 3B.2 baseline
`657aeb0334bb00b9a51f661fcbcf68abc95ce94b`. That baseline contains the
functional Block 3B.2 commit and changes only documentation afterward.

Block 4A changes only the explicit human-handoff capability. It introduces a
fail-closed operational transition without authorizing other functional
response changes, automatic outbound recovery or automatic handoff recovery.

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

A third isolated upgrade check applies every migration through the approved
Block 3B.2 baseline, inserts compatible existing data, applies the Block 4A
migration and validates the additive operation table, nullable delivery
reference, unique decision, defaults and foreign keys. No migration is applied
to staging.

The runner fails closed if either URL is non-loopback, if a database name is
outside the harness namespace, if the approved Block 4A baseline is not an
ancestor of `HEAD`, or if production source, schema or migration changes exceed
the explicit Block 4A allowlist. Teardown removes only containers created by
that runner invocation.

## Stateful boundaries

The Chatwoot fake records sanitized method, path, headers, body, order,
timestamp and configured response. It keeps conversation state (`ai_active`,
status, assignee, team, labels and messages), returns external message IDs, and
supports accepted, 4xx, 5xx without a remote effect, 5xx after a remote effect,
and accepted-but-response-ambiguous timeout behavior. The latter two preserve
the technical outbound reference so reconciliation can prove that the remote
message exists without resending it.

For operational handoff, the same fake now supports conversation snapshots and
stateful `ai_active` mutations with 4xx, 5xx before/after effect, timeout
before/after effect, deferred mutation and controlled eventual consistency. It
accepts only fields represented by the production client. This allows the
harness to prove the exact `GET -> PUT -> GET` sequence without accessing
Chatwoot.

The OpenAI-compatible fake records embeddings, intent classification, final
generation, memory extraction, exposed tools and returned tool calls
separately. Responses are configurable per category. Both fakes listen only on
`127.0.0.1` and never access the internet.

## Executable coverage

The production-entrypoint suite currently declares 32 Node tests:

- 27 executable scenarios;
- four functional specifications marked `test.todo`;
- one separate `test.todo` for automatic recovery of partial handoffs in
  Block 4B.

Thirteen executable scenarios retain the non-handoff controls from Blocks
0–3B.2. Fourteen scenarios exercise operational handoff: existing assignee,
existing team, unresolved destination, 4xx, 5xx without/with remote effect,
timeout without/with effect, confirmation outbound failure, duplicate after
completion, duplicate while partial, concurrent reset, post-handoff inbound and
sanitization.

A separate seven-test unit suite validates deterministic operation identity,
destination precedence, remote-state parsing and verification, sanitization,
decision immutability and manifest summary. Runtime V2 OFF remains a
transversal invariant asserted inside every executable HTTP scenario, not an
additional executable scenario.

The final Block 4A gate executed all 32 declarations: 27 passed, none failed,
and five remained `todo` by design.

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

Operational handoff resolves only an assignee already present or, if absent, a
team already present. The harness does not treat a bare inbox as a proven human
queue and does not create or change assignment, team, labels or status. Partial
handoff operations remain locally blocked and require Block 4B reconciliation;
no automatic handoff coordinator is added here.

## Lifecycle and build evidence

The runner:

1. starts and health-checks isolated PostgreSQL and Redis;
2. generates Prisma Client and applies existing migrations;
3. performs a fresh TypeScript build;
4. records the SHA-256 and timestamp of `dist/main.js` plus
   `dist/app.module.js` and the instrumented V1
   decision/manifest/control/outbound-delivery/recovery/runtime artifacts,
   including the operational-handoff contract;
5. starts both fakes and the production bootstrap;
6. waits for `/health`;
7. runs the HTTP tests serially;
8. stops the API with `SIGTERM`, allowing Nest lifecycle hooks to disconnect
   Prisma and Redis;
9. closes test clients and fakes, verifies their ports are closed, and removes
   the two owned containers.

The accepted fresh build recorded the combined V1 artifact-set SHA-256
`56c4a24b720184b7e843fb4d84c107a48935d9f091d8848d9d6c5c73cd4696af`
at `2026-07-25T19:12:30.876Z`; the individual `dist/main.js` SHA-256 was
`3b6f23e68dbc6103c45b3949ad8206e8e90e11dd8e71368be9c341a76ac0c4df`.
The related regression gate passed 254 of 254 tests, and the focused
operational-handoff unit suite passed 7 of 7.

## Visible future gaps

Four functional `test.todo` specifications intentionally remain non-blocking:

1. typo-tolerant deterministic BusinessHours;
2. multi-turn price continuity from formatting to motherboard repair;
3. full evidence beyond character 250;
4. useful and commercially complete handling of a slow computer.

They state the future contract and never assert the currently incorrect
response as accepted behavior.

The former handoff gap is now executable. A fifth `test.todo`, explicitly
scoped to Block 4B, records that partial handoff operations still need automatic
recovery and reconciliation. It is not counted as a functional-response gap.

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

## Operational handoff contract

The explicit human request seals one `OPERATIONAL_HUMAN_HANDOFF` decision with
provider prohibited. The executor persists one `AssistantHandoffOperation`,
then performs an atomic local transition from active/unpaused at the accepted
revision to inactive/paused at the next revision.

After the local block, the runtime:

1. reads the exact remote conversation;
2. resolves existing assignee before existing team;
3. withholds success when neither exists;
4. sends only `ai_active=false`;
5. reads the conversation again;
6. verifies scope, remote inactivity, compatible status and unchanged
   destination;
7. creates the visible confirmation and existing outbound delivery only after
   verification.

Remote failure or ambiguity leaves the operation
`RECONCILIATION_REQUIRED` and creates no success outbound. If verification
succeeds but the confirmation outbound fails, the operation remains
`CONFIRMATION_PENDING`; outbound recovery may restore only that confirmation.
Webhook duplicate never repeats the local block, mutation, verification or
confirmation. A concurrent reset supersedes the old operation through the
existing context/revision checkpoints.
