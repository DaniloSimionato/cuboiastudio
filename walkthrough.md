# FASE 3.2A — Memória Semântica

## Status

**APROVADO PARA COMMIT**

Decisão objetiva:

- A inconsistência do filtro `version` na reindexação foi corrigida.
- O claim concorrente agora permite reprocessar itens `READY` com versão nula ou desatualizada em relação à versão alvo.
- O worktree foi limpo dos artefatos de build em `.output/`.
- O Prisma foi validado com a CLI local do projeto, sem download externo.
- Os testes finais pedidos passaram.
- O lint global continua com passivo conhecido e o lint do escopo alterado ainda reporta ocorrências documentadas que já existiam no diff da Fase 3.2A antes desta correção final.

## Correção da versão

Comportamento final em `reindexMemories(...)`:

- `version` agora representa a **versão alvo/corrente** usada para localizar registros desatualizados.
- Quando `version` é enviada, a seleção usa:
  - `embeddingVersion IS NULL`
  - ou `embeddingVersion <> version`
- Quando `version` é omitida, o alvo usado no reprocessamento é `EMBEDDING_VERSION` (`v1`).

Complemento necessário que também foi corrigido:

- o claim agora aceita itens `READY` quando:
  - `embeddingVersion IS NULL`
  - ou `embeddingVersion <> targetVersion`
- isso evita o falso positivo em que a reindexação encontrava o item antigo, mas o claim o ignorava por estar `READY`.

Cobertura adicionada em `apps/api/test/contact-memories.test.mjs`:

- versão igual: item já em `v2` não é reprocessado quando `version: "v2"`.
- versão diferente: item em `v1` ou `legacy` é reprocessado quando `version: "v2"`.
- versão nula: item com `embeddingVersion = null` é reprocessado.
- parâmetro ausente: o escopo continua amplo, mas itens `READY` já atuais podem ser contabilizados como `ignored`.
- isolamento por empresa: reindexação de `company-1` não altera itens de `company-2`.
- isolamento por assistente: reindexação com `assistantId` só altera perfis do assistente alvo.

## Prisma

Validação local usada:

```bash
cd apps/api
npx --no-install prisma --version
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" \
  npx --no-install prisma validate --schema prisma/schema.prisma
```

Resultado:

- Prisma CLI local: `6.19.3`
- `@prisma/client`: `6.19.3`
- `prisma validate`: `The schema at prisma/schema.prisma is valid`
- Nenhuma versão externa foi baixada.
- Houve apenas o aviso normal de update disponível para `7.8.0`; não houve instalação.

## Lint

Passivo global preexistente:

- `npm run lint`: baseline preexistente de `1314` problemas.
- `npm --prefix apps/api run lint`: baseline preexistente de `339` problemas.
- Esses comandos não foram expandidos nesta execução para evitar atacar o passivo geral fora do escopo.

Lint do escopo alterado:

```bash
npx --no-install eslint \
  apps/api/src/app.module.ts \
  apps/api/src/assistant-conversations/assistant-conversations.service.ts \
  apps/api/src/assistants/assistants.service.ts \
  apps/api/src/assistants/dto/create-assistant.dto.ts \
  apps/api/src/assistants/dto/update-assistant.dto.ts \
  apps/api/src/contact-memories/contact-memories-extraction.service.ts \
  apps/api/src/contact-memories/contact-memories.controller.ts \
  apps/api/src/contact-memories/contact-memories.service.ts \
  src/routes/_app.memoria.tsx \
  src/services/contactMemoriesService.ts
```

Resultado final:

- `66` erros restantes.
- Eles estão concentrados em arquivos já alterados pela Fase 3.2A e já apareciam antes desta correção final.
- Principais categorias remanescentes:
  - `@typescript-eslint/no-explicit-any`
  - `prefer-const`
  - `no-empty`
  - `no-misleading-character-class`
  - `no-useless-escape`
  - `prettier/prettier` em `apps/api/src/contact-memories/contact-memories-extraction.service.ts`
- Esta execução removeu o ruído novo no serviço de memória e deixou documentado o passivo remanescente.

## Migrations

Conferência local:

- `20260710180000_add_contact_memory_system`
  - arquivo SQL presente: sim
  - já rastreada anteriormente: sim
  - aplicada localmente: sim
  - destrutiva/reset: não
  - entra neste commit: não, porque já existe e não foi alterada

- `20260710194000_add_usage_fields_to_contact_memory`
  - arquivo SQL presente: sim
  - relação com o schema atual: `usageCount`, `lastUsedAt` em `contact_memory_items`
  - aplicada localmente: sim
  - destrutiva/reset: não
  - pronta para aplicação incremental em staging: sim

- `20260710200912_add_semantic_memory_vector`
  - arquivo SQL presente: sim
  - relação com o schema atual:
    - extensão `vector`
    - campos semânticos em `assistants`
    - `embedding`, `embeddingModel`, `embeddingVersion`, `embeddingStatus`, `embeddedAt`, `contentHash`, `embeddingError` em `contact_memory_items`
  - aplicada localmente: sim
  - destrutiva/reset: não
  - observação: há `ALTER COLUMN ... DROP DEFAULT`, mas não há `DROP TABLE`, `TRUNCATE` ou `RESET`
  - pronta para aplicação incremental em staging: sim

- `20260710204035_add_embedding_processing_at`
  - arquivo SQL presente: sim
  - relação com o schema atual: `embeddingProcessingAt` em `contact_memory_items`
  - aplicada localmente: sim
  - destrutiva/reset: não
  - pronta para aplicação incremental em staging: sim

As quatro migrations acima aparecem em `_prisma_migrations` local.

## Worktree

Classificação final:

- A. Arquivos da Fase 3.2A
  - schema Prisma
  - migrations semânticas
  - módulos de cache
  - serviços/controllers/DTOs de memória
  - integração no Runtime
  - testes
  - frontend de memória
  - `walkthrough.md`

- B. Arquivos gerados
  - `.output/`
  - removidos do diff com `git restore --worktree -- .output` e `git clean -fd -- .output`

- C. Dados locais
  - `apps/api/storage/attachments/`
  - `storage/`
  - `scratch/`
  - `.DS_Store`
  - agora cobertos no `.gitignore` quando apropriado

- D. Alterações não relacionadas
  - `infra/auth-proxy/package-lock.json`
  - continua untracked e **não deve entrar no commit**

Arquivos explicitamente fora do commit:

- `.output/`
- anexos locais
- `storage/`
- `scratch/`
- `.DS_Store`
- `infra/auth-proxy/package-lock.json`

## Testes

Comandos executados:

- `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npm run db:format`
  - aprovado: n/a
  - falha: 0
  - resultado: `OK`

- `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npm run db:generate`
  - aprovado: n/a
  - falha: 0
  - resultado: `OK`

- `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npm run db:check`
  - aprovado: n/a
  - falha: 0
  - resultado: `Database connection OK`

- `npm run build`
  - aprovado: n/a
  - falha: 0
  - resultado: `OK`

- `npm --prefix apps/api run build`
  - aprovado: n/a
  - falha: 0
  - resultado: `OK`
  - observação: necessário porque os testes `.mjs` consomem `apps/api/dist`

- `node --test apps/api/test/contact-memories.test.mjs`
  - aprovado: `29`
  - falha: `0`
  - resultado: `OK`

- `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" node --test apps/api/test/contact-memories-db.test.mjs`
  - aprovado: `1`
  - falha: `0`
  - resultado: `OK`

- `node --test apps/api/test/assistant-flow-tool-scope.test.mjs`
  - aprovado: `10`
  - falha: `0`
  - resultado: `OK`

- `git diff --check`
  - aprovado: n/a
  - falha: `0`
  - resultado: `OK`

## Arquivos do commit

Conjunto final recomendado para o commit:

- `.gitignore`
- `apps/api/package.json`
- `apps/api/package-lock.json`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260710194000_add_usage_fields_to_contact_memory/migration.sql`
- `apps/api/prisma/migrations/20260710200912_add_semantic_memory_vector/migration.sql`
- `apps/api/prisma/migrations/20260710204035_add_embedding_processing_at/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/src/cache/cache.module.ts`
- `apps/api/src/cache/cache.service.ts`
- `apps/api/src/assistant-conversations/assistant-conversations.service.ts`
- `apps/api/src/assistants/assistants.service.ts`
- `apps/api/src/assistants/dto/create-assistant.dto.ts`
- `apps/api/src/assistants/dto/update-assistant.dto.ts`
- `apps/api/src/contact-memories/contact-memories.controller.ts`
- `apps/api/src/contact-memories/contact-memories-extraction.service.ts`
- `apps/api/src/contact-memories/contact-memories-security.utils.ts`
- `apps/api/src/contact-memories/contact-memories.service.ts`
- `apps/api/src/contact-memories/dto/reindex-contact-memory.dto.ts`
- `apps/api/test/contact-memories.test.mjs`
- `apps/api/test/contact-memories-db.test.mjs`
- `apps/api/test/assistant-flow-tool-scope.test.mjs`
- `docker-compose.staging.yml`
- `infra/docker-compose.local.yml`
- `src/routes/_app.memoria.tsx`
- `src/services/contactMemoriesService.ts`
- `walkthrough.md`

## Pendências

Pendências não bloqueantes para este commit:

- o lint do escopo alterado ainda não zera; restam `66` ocorrências documentadas em arquivos já alterados pela Fase 3.2A
- `infra/auth-proxy/package-lock.json` permanece untracked e deve continuar fora deste commit
  - fixo no serviço: `50`

Comportamento importante:

- o campo `version` **não é um filtro por valor arbitrário**
- ao informar `version`, o serviço hoje só reaplica a lógica “versão diferente da `EMBEDDING_VERSION` atual ou nula”
- portanto, no relatório, `version` não deve ser tratado como filtro plenamente implementado por valor enviado

Rejeição cross-tenant:

- `assistantId` inválido ou de outro tenant gera erro
- `companyId` diferente não acessa itens de outro tenant

## Runtime

Ponto real de integração:

- `AssistantConversationsService.sendMessage(...)`
- sequência:
  1. resolve/atualiza conversa e mensagem do usuário
  2. resolve/cria `contactMemoryProfile`
  3. carrega memórias estruturadas
  4. tenta busca semântica
  5. aplica ranking híbrido
  6. gera `memoryContextBlock`
  7. passa `memoryContextBlock` para `PromptCompilerService.compile(...)`
  8. só depois chama o provider de chat

Fallbacks confirmados:

- falha de cache: busca continua
- falha na busca vetorial: Runtime continua com memória estruturada
- flag semântica desligada: Runtime continua com memória estruturada
- memória sem embedding pronto: Runtime continua com memória estruturada

## Testes

### Prisma / banco

- comando: `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npx prisma validate --schema apps/api/prisma/schema.prisma`
  - aprovadas: `0`
  - falhas: `1`
  - resultado: `FALHOU`
  - detalhe: CLI `7.8.0` externo rejeitou `datasource.url` no schema; problema de toolchain, não evidência direta de drift funcional

- comando: `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npm run db:format`
  - aprovadas: `1`
  - falhas: `0`
  - resultado: `OK`

- comando: `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npm run db:generate`
  - aprovadas: `1`
  - falhas: `0`
  - resultado: `OK`

- comando: `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" npm run db:check`
  - aprovadas: `1`
  - falhas: `0`
  - resultado: `OK`

### Build / lint

- comando: `npm run build`
  - aprovadas: `1`
  - falhas: `0`
  - resultado: `OK`

- comando: `npm run lint`
  - aprovadas: `0`
  - falhas: `1314`
  - resultado: `FALHOU`
  - observação: erros espalhados pelo frontend, scripts, seed e arquivos fora da Fase 3.2A; não foram introduzidos por esta auditoria

- comando: `npm --prefix apps/api run lint`
  - aprovadas: `0`
  - falhas: `339`
  - resultado: `FALHOU`
  - observação: também há muitos problemas preexistentes fora do escopo da memória semântica

### Testes executados

- comando: `node --test apps/api/test/contact-memories.test.mjs`
  - aprovadas: `25`
  - falhas: `0`
  - resultado: `OK`

- comando: `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public" node --test apps/api/test/contact-memories-db.test.mjs`
  - aprovadas: `1`
  - falhas: `0`
  - resultado: `OK`

- comando: `node --test apps/api/test/assistant-flow-tool-scope.test.mjs`
  - aprovadas: `10`
  - falhas: `0`
  - resultado: `OK`

Consultas de banco executadas e confirmadas:

- `SELECT extname FROM pg_extension WHERE extname = 'vector';`
  - resultado: `vector`

- colunas semânticas em `contact_memory_items`
  - `contentHash`
  - `embeddedAt`
  - `embedding`
  - `embeddingError`
  - `embeddingModel`
  - `embeddingProcessingAt`
  - `embeddingStatus` (default: `'PENDING'`)
  - `embeddingVersion`

- defaults dos assistentes consultados:
  - `semanticMemoryEnabled=false`
  - `semanticMemoryThreshold=0.7`
  - `semanticMemoryMaxCandidates=20`
  - `semanticMemoryMaxResults=10`

## Teste Apple

Resultado no caminho real do Runtime:

- `Quantos computadores Apple eu tenho?` -> selecionada
- `Quais equipamentos da Apple estão registrados?` -> selecionada
- `Quantos Macs esse cliente possui?` -> selecionada
- `Ele tem algum computador da marca da maçã?` -> selecionada
- `Qual é o horário de funcionamento?` -> não selecionada
- `Quero remarcar minha quadra.` -> não selecionada
- `Qual é o valor da mensalidade?` -> não selecionada

Memória usada:

- `O cliente possui 3 MacBook Air e 2 Mac Mini.`

## Git Diff

Arquivos alterados relevantes da implementação:

- backend / schema / migrations
  - `apps/api/package.json`
  - `apps/api/package-lock.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260710194000_add_usage_fields_to_contact_memory/`
  - `apps/api/prisma/migrations/20260710200912_add_semantic_memory_vector/`
  - `apps/api/prisma/migrations/20260710204035_add_embedding_processing_at/`
- backend / módulos / serviços / dto / controller
  - `apps/api/src/app.module.ts`
  - `apps/api/src/cache/cache.module.ts`
  - `apps/api/src/cache/cache.service.ts`
  - `apps/api/src/assistant-conversations/assistant-conversations.service.ts`
  - `apps/api/src/assistants/assistants.service.ts`
  - `apps/api/src/assistants/dto/create-assistant.dto.ts`
  - `apps/api/src/assistants/dto/update-assistant.dto.ts`
  - `apps/api/src/contact-memories/contact-memories.service.ts`
  - `apps/api/src/contact-memories/contact-memories-extraction.service.ts`
  - `apps/api/src/contact-memories/contact-memories.controller.ts`
  - `apps/api/src/contact-memories/contact-memories-security.utils.ts`
  - `apps/api/src/contact-memories/dto/reindex-contact-memory.dto.ts`
- testes
  - `apps/api/test/contact-memories.test.mjs`
  - `apps/api/test/contact-memories-db.test.mjs`
  - `apps/api/test/assistant-flow-tool-scope.test.mjs`
- frontend / API client
  - `src/routes/_app.memoria.tsx`
  - `src/services/contactMemoriesService.ts`
- infra
  - `docker-compose.staging.yml`
  - `infra/docker-compose.local.yml`
- relatório
  - `walkthrough.md`

Alterações locais/geradas que não devem ser confundidas com escopo funcional:

- `.output/*` inteiro
- `apps/api/storage/attachments/chatwoot/internal-conversation-1/*`
- `scratch/ui-screenshot.js`
- `storage/*`
- `.DS_Store`
- `infra/auth-proxy/package-lock.json`

## Pendências

- corrigir ou isolar o failure do comando literal `npx prisma validate --schema apps/api/prisma/schema.prisma` para o ambiente atual
- resolver o passivo de lint do repositório (`npm run lint` e `npm --prefix apps/api run lint`)
- decidir se os artefatos gerados/locales (`.output`, anexos, `scratch`, `storage`) devem ser ignorados, removidos do worktree ou rastreados
- rastrear/confirmar as migrations novas no git
- ajustar o filtro `version` da reindexação para comparar com o valor recebido, caso esse seja o comportamento desejado do endpoint
