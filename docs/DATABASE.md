# DATABASE.md

Documento base do banco de dados do Cubo AI Studio.

## Objetivo do banco

O banco deve sustentar uma arquitetura multiempresa desde o primeiro dia, com isolamento por empresa, rastreabilidade e suporte a evolucao futura do produto.

Nesta fase, o foco e somente a fundacao estrutural do schema e da conexao com Prisma.

## Tabelas criadas nesta fase

### `companies`

- representa uma empresa/tenant
- possui nome, documento opcional, status, timestamps e soft delete opcional
- possui uma configuracao de IA por tenant em `company_ai_settings`

### `company_ai_settings`

- representa a configuracao de IA por empresa/tenant
- possui `runtimeEnabled`, `provider`, `baseUrl`, `model`, `requestTimeoutMs`, status e timestamps
- armazena a API key cifrada em `encryptedApiKey`, com `apiKeyIv` e `apiKeyAuthTag` para decriptacao no backend
- registra o ultimo teste seguro em `lastTestAt`, `lastTestStatus` e `lastTestError`
- pertence a uma empresa e nunca devolve o segredo em claro ao frontend

### `users`

- representa usuarios vinculados a uma empresa
- possui nome, email, status, timestamps e soft delete opcional

### `assistants`

- representa os assistentes IA do tenant
- possui nome, descrição opcional, mensagem inicial opcional, instrucoes opcionais, modelo preferencial opcional, temperatura opcional, status e timestamps
- pertence a uma empresa
- ja esta normalizada no Prisma Client e usada pela rota `GET /assistants`

### `assistant_knowledge`

- representa itens manuais de conhecimento vinculados a um assistente
- possui titulo, conteudo, status e timestamps
- pertence a um assistant e a uma empresa

### `assistant_conversations`

- representa conversas iniciais vinculadas a um assistant do tenant
- possui titulo opcional, status e timestamps
- pertence a uma empresa, a um assistant e opcionalmente ao usuario que iniciou a conversa

### `assistant_conversation_messages`

- representa mensagens persistidas da conversa
- possui role, content, sources opcionais, mode opcional e timestamps
- pertence a uma empresa, a um assistant e a uma conversation

### `roles`

- representa papeis de acesso
- pode ser global ou associado a uma empresa

### `permissions`

- representa o catalogo de permissoes
- usa `key` unica como identificador funcional

### `role_permissions`

- representa a associacao entre roles e permissoes
- permite carregar permissões persistidas no auth guard

### `user_roles`

- representa a associacao entre usuarios e papeis

## Relacoes

- `companies` possui muitos `users`
- `companies` possui muitos `roles`
- `companies` possui muitos `assistants`
- `companies` possui muitos `assistant_knowledge`
- `companies` possui muitas `assistant_conversations`
- `companies` possui muitas `assistant_conversation_messages`
- `companies` possui uma `company_ai_settings`
- `users` possui muitos `user_roles`
- `users` possui muitas `assistant_conversations`
- `roles` possui muitos `user_roles`
- `roles` possui muitos `role_permissions`
- `permissions` possui muitos `role_permissions`
- `assistants` possui muitos `assistant_knowledge`
- `assistants` possui muitas `assistant_conversations`
- `assistants` possui muitas `assistant_conversation_messages`
- `assistant_conversations` possui muitas `assistant_conversation_messages`

## Decisoes tomadas

- Prisma foi configurado com datasource PostgreSQL.
- A conexao depende de `DATABASE_URL`.
- No desenvolvimento local, o Postgres deste projeto usa a porta `5433` para evitar conflito com outros bancos locais.
- O schema foi preparado com multiempresa desde o inicio.
- O status padrao usa enum `ACTIVE | INACTIVE`.
- `roles` podem ser globais ou por empresa.
- `permissions` sao globais nesta fase inicial.
- `role_permissions` foi adicionada para suportar RBAC persistido básico em desenvolvimento.
- `deletedAt` foi incluido em `companies` e `users` para permitir soft delete futuro.
- `assistants` foi adicionada como primeira entidade de domínio real para listagem por tenant.
- `assistants` foi normalizada no Prisma Client para permitir uso do delegate padrao no service.
- o seed de desenvolvimento criou um assistente demo idempotente para o tenant demo.
- `assistant_knowledge` foi criada como base inicial de conhecimento manual por assistant.
- `assistant_knowledge` usa `status` para remoção lógica simples, mantendo o item fora da listagem ativa quando `INACTIVE`.
- o preview determinístico do assistant usa apenas `assistant_knowledge` com `status = ACTIVE` e não grava histórico nesta fase.
- `assistant_preview_logs` registra execucoes validas de preview e runtime deterministico com pergunta, resposta, modo e fontes seguras. O campo `mode` diferencia `deterministic-preview` de `deterministic-runtime`.
- `assistant_conversations` foi criada como a base inicial de conversas do runtime, mantendo tenant isolation e vínculo com o assistant.
- `assistant_conversation_messages` foi criada para persistir mensagens de usuário e assistente.
- as mensagens do runtime de conversa podem usar IA real quando a configuracao do tenant ou `.env` estiver habilitada e valida, mantendo fallback deterministico quando a IA estiver desabilitada, incompleta ou indisponivel.
- `initialMessage` foi adicionada ao Assistant para permitir uma primeira mensagem persistida quando uma conversa nova e criada.
- `company_ai_settings` foi criada para armazenar a configuração de IA por tenant com API key cifrada no backend.

## Visao futura para IA real

Quando o cerebro da IA sair do modo deterministico, o assistant ja conta com campos conceituais como:

- `initialMessage`
- `instructions`
- `model`
- `temperature`

Esses dados pertencem ao dominio do assistant, nao ao frontend nem a mocks temporarios.

O provider real de IA tambem deve ser tratado como configuracao backend-only, com suporte futuro a `AI_RUNTIME_ENABLED`, `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL` e `AI_API_KEY`.

`AI_API_KEY` nunca deve ser persistida no banco do assistant.
No cenário multi-tenant, a configuração salva por empresa usa criptografia no backend e nunca retorna a chave ao frontend.

O schema futuro precisa continuar preservando o fallback deterministico, a auditoria e o isolamento por tenant.

## O que ainda nao foi implementado

- `tools`
- `knowledge_bases`
- `channels`
- `execution_logs`
- `ai_usage_events`
- `assistant_knowledge` com upload, embeddings, chunking ou busca semântica
- observabilidade avancada de tokens/custos/tracing
- resumo persistido avancado de conversa
- qualquer fluxo real de login
- qualquer integracao com Cubo.Chat

## Migrations relevantes recentes

- `007_assistant_ai_settings`: adiciona `instructions`, `model` e `temperature` ao Assistant.
- `008_company_ai_settings`: adiciona configuracao de IA por tenant com segredo cifrado.
- `009_assistant_initial_message`: adiciona `initialMessage` ao Assistant para o Runtime Pipeline v1.

## Observacao operacional

Nesta fase nao deve ser executada migration em banco real se `DATABASE_URL` nao estiver configurado.
O trabalho aqui e validar schema, estrutura e integracao do Prisma com o NestJS.

## Migration inicial

- nome sugerido: `001_initial_identity_schema`
- contem apenas o schema estrutural criado na BE-002
- nao adiciona regras de negocio
- nao inclui tabelas de dominio futuro

## Validacao local

O setup local do banco, o comando de validacao de conexao e o Docker Compose de desenvolvimento estao documentados em `docs/BACKEND_SETUP.md`.
O fluxo local completo usa `npm run setup:local` e, por padrao, a API responde em `http://localhost:3001`.
O `DATABASE_URL` local padrao aponta para `postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public`.
O comando oficial para subir a API e `npm run api:start`.
Nao use `npx prisma` sem versao fixa neste projeto.

O smoke test ponta a ponta do backend esta documentado em `docs/SMOKE_TEST_BACKEND.md`.

## Operacao local validada

Fluxo oficial validado:

```bash
npm run setup:local
npm run api:start
npm run smoke:backend
```

Fluxo manual alternativo:

```bash
npm run db:local:up
cp .env.example .env
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run prisma:seed
npm run api:start
npm run smoke:backend
```

Resumo operacional:

- Docker Compose local: `infra/docker-compose.local.yml`
- Postgres local deste projeto: `localhost:5433`
- API local validada: `http://localhost:3001`
- migrations: `npm --prefix apps/api run prisma:migrate`
- seed: `npm --prefix apps/api run prisma:seed`

## AssistantRuntimeLog

A migration `010_assistant_runtime_logs` criou `assistant_runtime_logs` para auditoria segura das execucoes do runtime de conversa.

O log salva apenas metadados seguros:

- ids de rastreio: `assistantId`, `conversationId`, `userMessageId`, `assistantMessageId`
- `mode`, `status`, `provider`, `model`, `configurationSource`
- `fallback`, `fallbackReason`, `outcome`, `durationMs`
- `providerStatus`, `providerErrorType`, `providerErrorCode`, `providerErrorMessage` sanitizado
- `knowledgeCount`, `historyMessagesUsed`, `historyLimit`
- `initialMessageIncluded`, `instructionsIncluded`

O log nao salva:

- API key
- headers ou `Authorization`
- prompt completo ou system prompt completo
- body bruto enviado ao provider
- resposta bruta completa do provider
- stack trace

A resposta textual do assistant continua em `assistant_conversation_messages`; o log nao duplica conteudo extenso.
