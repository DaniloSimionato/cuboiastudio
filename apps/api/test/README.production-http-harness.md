# Production HTTP harness — policy block 0

This harness is an integration boundary for the deployed baseline
`02f3ccc61f320f87c06ff50d2f7ba809e08cc4ad`. It does not change production
behavior.

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

Only baseline migrations are applied with `prisma migrate deploy`. The runner
fails closed if either URL is non-loopback, if the database name is outside the
harness namespace, if `HEAD` is not the approved baseline, or if production
source, schema or migration files differ from `HEAD` in the index, worktree or
untracked files. Teardown removes only containers created by that runner
invocation.

## Stateful boundaries

The Chatwoot fake records sanitized method, path, headers, body, order,
timestamp and configured response. It keeps conversation state (`ai_active`,
status, assignee, team, labels and messages), returns external message IDs, and
supports accepted, 4xx, 5xx and timeout behavior.

The OpenAI-compatible fake records embeddings, intent classification, final
generation, memory extraction, exposed tools and returned tool calls
separately. Responses are configurable per category. Both fakes listen only on
`127.0.0.1` and never access the internet.

## Executable coverage and limits

The runner declares nine Node tests: four executable scenarios (A–D) and five
future specifications marked `test.todo`. Runtime V2 OFF is a transversal
invariant asserted inside every executable scenario, not a fifth executable
scenario.

The fixtures deliberately disable message buffering, memory and response
splitting to keep lifecycle and outbound counts deterministic. Therefore this
harness does not yet validate concurrent buffering. It also does not reproduce
every possible production condition; it validates the named controls through
the production bootstrap and central services while Chatwoot and the provider
remain fake HTTP boundaries.

## Lifecycle and build evidence

The runner:

1. starts and health-checks isolated PostgreSQL and Redis;
2. generates Prisma Client and applies existing migrations;
3. performs a fresh TypeScript build;
4. records the SHA-256 and timestamp of `dist/main.js` plus
   `dist/app.module.js`;
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

## Current delivery limitation

The dedupe control proves one logical processing, one final generation and one
outbound for two deliveries of the same external message ID. It does not claim
delivery reconciliation: in Runtime V1, an inbound already marked as processed
can prevent a later attempt when a decision was persisted but its outbound was
never confirmed. The harness records this limitation without changing the
current behavior.
