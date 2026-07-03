# SMOKE_TEST_BACKEND.md

Guia operacional para validar o backend do Cubo AI Studio ponta a ponta em ambiente local.

## Objetivo

Validar que o backend sobe com banco real, seed, auth dev, tenant, RBAC, assistants, knowledge, preview, runtime, logs, a configuracao segura de IA por tenant e o diagnostico seguro da IA funcionando juntos.

Este smoke test é local e não depende de API key real. Quando o runtime de IA estiver desabilitado, o fluxo permanece determinístico e seguro; quando estiver habilitado em ambiente controlado, o backend pode tentar o provider real sem que o smoke deixe de validar o fallback seguro.

Status atual:

- smoke real validado na BE-020
- API local validada em `http://localhost:3001`
- Postgres local validado em `localhost:5433`

## Pré-requisitos

- Docker Desktop instalado e em execução no macOS
- `docker compose` disponível
- `.env` presente na raiz do projeto
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public`
- API do backend executando em `http://localhost:3001`

## Preparação do ambiente

1. Suba os serviços locais:

```bash
npm run setup:local
```

Se preferir subir apenas o banco e o Redis:

```bash
npm run db:local:up
```

2. O bootstrap ja faz:

- cria `.env` a partir de `.env.example` se ele nao existir
- valida `DATABASE_URL`
- sobe Postgres e Redis no Docker
- aguarda os containers ficarem saudaveis
- roda `prisma:generate`
- roda `db:check`
- roda `prisma:migrate` com `prisma migrate deploy`
- roda `db:seed`

Não use `npx prisma` genérico neste projeto, porque ele pode puxar Prisma 7 e quebrar o schema atual.

3. Se quiser validar apenas a conexao, rode:

```bash
npm run db:check
```

4. Suba a API:

```bash
npm run api:start
```

Se preferir rodar manualmente:

```bash
npm --prefix apps/api run build
npm --prefix apps/api run start
```

## Como executar o smoke test

Com a API rodando em `http://localhost:3001`:

```bash
npm run smoke:backend
```

O valor padrao do script ja e `http://localhost:3001`.

Se quiser apontar para outro endpoint:

```bash
API_URL=http://localhost:3001 npm run smoke:backend
```

Se a API ainda nao estiver no ar, o smoke para com uma mensagem amigavel indicando para executar `npm run api:start` primeiro.

## Limpeza segura de artifacts antigos de smoke

Registros historicos de smoke podem permanecer no banco local, especialmente assistants antigos com nomes legacy. Eles nao devem aparecer na UI padrao, mas podem ser inativados com o script seguro:

```bash
node scripts/cleanup-smoke-artifacts.mjs
```

Sem argumentos, o script roda em `dry-run` e apenas imprime:

- assistants encontrados
- ids e nomes que seriam afetados
- conversas vinculadas
- mensagens vinculadas, preservadas
- knowledge vinculada
- preview logs vinculados, preservados

Para aplicar a limpeza:

```bash
node scripts/cleanup-smoke-artifacts.mjs --apply
```

O script usa filtros conservadores e considera somente assistants cujo nome comece com:

- `[SMOKE]`
- `Assistente Smoke Test`

A limpeza aplicada:

- define `Assistant.status = INACTIVE`
- define `AssistantConversation.status = INACTIVE` para conversas 100% vinculadas aos assistants de smoke
- define `AssistantKnowledge.status = INACTIVE` para knowledge 100% vinculada aos assistants de smoke
- preserva mensagens, porque `AssistantConversationMessage` nao possui `status`
- preserva preview logs, porque `AssistantPreviewLog` nao possui `status`
- nao altera `Assistente Demo`
- nao altera configuracoes reais de IA
- nao altera API keys, provider, tenant, RBAC ou seed valido da aplicacao
- executa alteracoes com transacao Prisma no modo `--apply`

## O que o script valida

- `GET /diagnostics/rbac`
- `GET /diagnostics/ai`
- `GET /settings/ai`
- `GET /settings/ai/options`
- `PATCH /settings/ai`
- `GET /companies/current`
- `GET /health`
- CRUD basico de Assistants
- persistencia de `initialMessage`, `instructions`, `model` e `temperature` em Assistant
- `GET /assistants` sem auth e sem permissão
- `POST /assistants`
- `GET /assistants/:id`
- `PATCH /assistants/:id`
- `PATCH /assistants/:id/status`
- CRUD manual da Knowledge Base
- `POST /assistants/:assistantId/knowledge`
- `GET /assistants/:assistantId/knowledge`
- `PATCH /assistants/:assistantId/knowledge/:knowledgeId`
- `DELETE /assistants/:assistantId/knowledge/:knowledgeId`
- conversas iniciais do runtime
- `POST /assistants/:assistantId/conversations`
- mensagem inicial persistida como `assistant` com `mode: initial-message`, quando configurada
- `GET /assistants/:assistantId/conversations`
- `GET /assistants/:assistantId/conversations/:conversationId/messages`
- `POST /assistants/:assistantId/conversations/:conversationId/messages`
- payload de runtime com `mode`, `assistant`, `temperature`, `outcome` e `summary`
- metadados seguros de contexto em `runtime.context`, incluindo quantidade de historico recente usada, limite, mensagem inicial incluida e instrucoes incluidas
- preview deterministico
- `POST /assistants/:id/preview`
- runtime com fallback deterministico ou IA real quando habilitada
- `POST /assistants/:id/run`
- logs de execucao
- `GET /assistants/:assistantId/preview-logs`
- erros esperados `401`, `403`, `400` e `404`

## Resultado esperado

O script deve:

- falhar se qualquer status esperado não for retornado
- imprimir os ids gerados para assistant e knowledge
- retornar sucesso apenas quando o fluxo principal estiver íntegro
- criar assistants técnicos com prefixo `[SMOKE]`
- inativar o assistant criado no `finally`, para reduzir poluicao da UI manual

## Limitações conhecidas

- O smoke test cria dados de desenvolvimento no banco local.
- O script não remove fisicamente os registros criados, mas inativa o assistant técnico criado e a UI padrão de `/testes` oculta registros `[SMOKE]`.
- Registros legados de smoke com nome `Assistente Smoke Test...` também ficam ocultos no laboratório `/testes`.
- Se `DATABASE_URL` estiver vazia, o smoke test não valida runtime real.
- Se a API não estiver rodando, o script falha imediatamente.
- O fluxo de conversas valida que mensagens de `user` e `assistant` são persistidas pelo runtime determinístico.
- O diagnóstico de IA validado pelo smoke não chama provider externo e continua seguro sem API key.
- A configuração de IA por tenant validada pelo smoke nao envia API key. O script desabilita temporariamente `runtimeEnabled` para manter o fluxo determinístico e restaura os campos nao secretos da configuracao original ao final.
- O smoke valida os presets de provider/modelo/timeout em `GET /settings/ai/options`, mas nao chama `POST /settings/ai/test`.

## Limpeza de dados técnicos

O smoke evita apagar dados do usuário e não chama `DELETE /settings/ai/api-key`.
Para preservar segurança e histórico local, ele usa duas proteções:

- nomeia artifacts técnicos com `[SMOKE]`
- inativa o assistant criado ao final do fluxo

Se um smoke for interrompido antes do `finally`, a tela `/testes` ainda oculta assistants `[SMOKE]` ou nomes legados `Assistente Smoke Test...` por padrão.

## Observação

Este guia complementa `docs/BACKEND_SETUP.md` e `docs/DATABASE.md`.
O frontend da demo local também usa a mesma API em `http://localhost:3001`, com
headers dev injetados apenas em desenvolvimento.

## Logs de runtime no smoke

O smoke valida os logs seguros de runtime sem depender de provider externo.

Fluxo validado:

- envia mensagem em uma conversa de assistant `[SMOKE]`
- confirma que `runtime.logId` foi retornado
- consulta `GET /logs/ai?assistantId=...&conversationId=...`
- consulta `GET /logs/ai/:id`
- valida `mode`, `status`, `fallback`, `outcome`, `historyMessagesUsed` e `createdAt`
- valida que o payload nao contem `apiKey`, `prompt` ou `authorization`

O smoke nao chama `POST /settings/ai/test`, nao remove API key real e nao depende de chamada externa ao provider.
