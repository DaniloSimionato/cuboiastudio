# BACKEND_SETUP.md

Guia de setup local do backend do Cubo AI Studio.

Este documento descreve apenas o ambiente de desenvolvimento local.

## Fluxo oficial validado

Use este fluxo como caminho principal:

```bash
npm run setup:local
npm run api:restart
npm run smoke:backend
```

Ambiente validado:

- API local em `http://localhost:3001`
- frontend local em `http://localhost:8080`
- Postgres local deste projeto em `localhost:5433`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public`
- para o fluxo real com CuboChat, expor a API com `cloudflared tunnel --url http://localhost:3001`

Referencias rapidas:

- guia principal da integracao: [CUBOCHAT_INTEGRATION.md](./CUBOCHAT_INTEGRATION.md)
- quickstart operacional: [CHATWOOT_E2E_QUICKSTART.md](./CHATWOOT_E2E_QUICKSTART.md)
- diagnostico local: [API_LOCAL_DIAGNOSTICS.md](./API_LOCAL_DIAGNOSTICS.md)

Alerta importante:

- Nao use `npx prisma` generico neste projeto, pois isso pode baixar Prisma 7 e quebrar o schema atual.
- Use sempre os scripts do projeto.

## Fluxo manual alternativo

Se preferir executar passo a passo:

```bash
npm run db:local:up
cp .env.example .env
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run prisma:seed
npm run api:restart
npm run smoke:backend
```

## Pre-requisitos

- macOS com Docker Desktop instalado
- Node.js instalado
- npm instalado
- Postgres local disponivel via Docker
- Redis local disponivel via Docker

## Passo 0: verificar o Docker

Antes de qualquer coisa, confirme que o Docker Desktop esta instalado e em execucao.

No terminal, rode:

```bash
docker --version
docker compose version
```

Se o comando retornar `command not found`, significa que o Docker CLI nao esta disponivel no PATH ou o Docker Desktop nao esta instalado/iniciado.

Se o Docker Desktop estiver instalado, abra o aplicativo e aguarde o status indicar que ele esta pronto antes de continuar.

Se quiser validar o ambiente local em um unico passo, rode:

```bash
npm run setup:local
```

Esse comando prepara o ambiente, sobe Postgres e Redis, roda `prisma:generate`, `db:check`, `prisma:migrate` e `db:seed`.
O `prisma:migrate` deste projeto aplica migrations com `prisma migrate deploy`, de forma nao interativa.

Importante:

- o arquivo `.env` fica na raiz do repositório
- os scripts do backend leem esse `.env` automaticamente
- o projeto nao deve usar `npx prisma` generico, porque isso pode puxar Prisma 7 e quebrar o schema atual

Observacao:

- o projeto possui `bun.lock`, mas a validacao atual do backend esta sendo feita com `npm`
- por isso, os comandos abaixo usam `npm`
- o Postgres local deste projeto usa a porta `5433` para evitar conflito com outros bancos locais

## Como configurar `.env`

1. Rode `npm run setup:local` para tentar preparar o ambiente automaticamente.
2. Se o arquivo `.env` nao existir, o bootstrap copia `.env.example` para `.env`.
3. Se o arquivo `.env` ja existir, ele nunca sera sobrescrito.
4. Ajuste apenas o que for necessario para o seu ambiente local.
5. Nao coloque secrets reais no arquivo.

Variaveis esperadas:

- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `APP_ENCRYPTION_KEY`
- `AI_RUNTIME_ENABLED`
- `AI_PROVIDER`
- `AI_BASE_URL`
- `AI_MODEL`
- `AI_API_KEY`
- `AI_REQUEST_TIMEOUT_MS`
- `ASSISTANT_KNOWLEDGE_MIN_SCORE_OVERRIDES`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `CHATWOOT_URL`
- `CHATWOOT_TOKEN`

### Valores locais sugeridos

O arquivo `.env.example` ja vem com valores de desenvolvimento sem segredo real.
Use-os como base apenas para rodar localmente.

Valor esperado para o banco local deste projeto:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cubo_ai_studio?schema=public
```

### Valores locais sugeridos para IA

O provider backend-only pode ficar desabilitado por padrao:

```env
AI_RUNTIME_ENABLED=false
AI_PROVIDER=openai-compatible
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=
AI_REQUEST_TIMEOUT_MS=30000
```

Esse estado mantem o runtime deterministico e permite validar o status seguro em `GET /diagnostics/ai` sem chamar API externa.

Para salvar uma chave por tenant em `PATCH /settings/ai`, o backend precisa de `APP_ENCRYPTION_KEY`. Em desenvolvimento, use uma chave de 32 bytes em hex ou base64 e nunca comite uma chave real.

Exemplo para gerar uma chave local em base64:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Se `APP_ENCRYPTION_KEY` estiver ausente ou invalida, salvar provider sem `apiKey` continua permitido, mas salvar uma nova chave retorna `400` com mensagem controlada. O frontend deve exibir essa mensagem para orientar a correcao do `.env`.

### Configuracao de IA pela UI

A tela `/configuracoes` usa presets seguros em `GET /settings/ai/options`:

- OpenAI: `https://api.openai.com/v1`, modelos `gpt-4o-mini` e `gpt-4o`
- DeepSeek: `https://api.deepseek.com/v1`, modelo `deepseek-chat`
- Custom: permite informar `baseUrl` e `model` manualmente

O teste de conexao em `POST /settings/ai/test` deve ser feito somente depois de salvar uma configuracao valida. Esse teste pode chamar provider externo quando houver chave real, por isso nao faz parte do smoke obrigatorio.

Quando o provider recusar a chamada, a resposta agora inclui diagnostico sanitizado:

- `providerStatus`: status HTTP retornado pelo provider
- `providerError.message`: mensagem segura retornada pelo provider
- `providerError.type`, `providerError.code` e `providerError.param`, quando existirem

Interpretação comum:

- `401` ou `403`: chave invalida, chave sem permissao ou organizacao/projeto sem acesso
- `429`: quota, rate limit, billing ou credito insuficiente
- `400` ou `404`: modelo, endpoint, base URL ou payload incompativel
- `5xx`: falha temporaria do provider

Nunca cole API key real em prints, tickets, chat ou logs ao investigar esses erros.

## Como subir o Postgres local

Use o arquivo:

- `infra/docker-compose.local.yml`

Comando:

```bash
docker compose -f infra/docker-compose.local.yml up -d
```

Ou, para subir tudo e preparar o ambiente completo:

```bash
npm run setup:local
```

Aliases uteis:

```bash
npm run db:local:up
npm run db:local:down
npm run db:local:logs
```

## Como rodar Prisma generate

```bash
npm run db:generate
```

Ou diretamente na API:

```bash
npm --prefix apps/api run prisma:generate
```

## Como rodar migrations

Se o banco local estiver disponivel e `DATABASE_URL` estiver configurado:

```bash
npm run db:migrate
```

Ou diretamente na API:

```bash
npm --prefix apps/api run prisma:migrate
```

Esse comando aplica as migrations existentes com `prisma migrate deploy`.

### Migration inicial incluida

- `apps/api/prisma/migrations/001_initial_identity_schema`

Se o ambiente ainda nao tiver `DATABASE_URL`, nao force a migracao.
Nesse caso, apenas mantenha o schema e o SQL da migration versionados.

## Como rodar a API

```bash
npm run api:start
```

Se preferir executar manualmente:

```bash
npm --prefix apps/api run build
npm --prefix apps/api run start
```

Nao use `start:dev` porque esse script nao existe neste momento.

## Como rodar o frontend para a demo local

Com a API local ja disponível, suba o frontend em outro terminal:

```bash
npm run dev
```

O frontend sobe em `http://localhost:8080` e, em desenvolvimento, usa `VITE_API_URL=http://localhost:3001`
para falar com a API local.

Para validar a integracao real com CuboChat em ambiente local, depois de subir a API rode tambem:

```bash
cloudflared tunnel --url http://localhost:3001
```

E teste:

```bash
curl -i http://localhost:3001/health
curl -i https://SUA_URL_TRYCLOUDFLARE/health
```

O webhook publico esperado fica em:

```text
https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET
```

As telas de Assistentes, Base de Conhecimento, Teste/runtime e a barra superior já consomem o backend real
sem alterar o fluxo de auth/RBAC/Tenant.

O diagnóstico seguro do provider de IA fica em `GET /diagnostics/ai` e `POST /diagnostics/ai/test`, ambos protegidos por `settings:read`.

Se o Vite escolher outra porta local na máquina, a API continua aceitando a origem
`localhost` em desenvolvimento para evitar `Failed to fetch` na demo visual.

## Como testar `GET /health`

Com a API rodando, execute:

```bash
curl http://localhost:3001/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "Cubo AI Studio API",
  "version": "0.1.0"
}
```

## Comandos com npm

- `npm run setup:local`
- `npm run docker:up`
- `npm run docker:down`
- `npm run docker:logs`
- `npm run api:start`
- `npm run db:generate`
- `npm run db:format`
- `npm run db:studio`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:reset:dev`
- `npm run db:check`

## Validar conexao com o banco

Use:

```bash
npm run db:check
```

Esse comando apenas tenta conectar no banco configurado em `DATABASE_URL`.
Ele nao executa migration e nao cria dados.

## Observacoes importantes

- `DATABASE_URL` precisa apontar para o Postgres local em desenvolvimento.
- `REDIS_URL` aponta para o Redis local quando necessario.
- Os valores do `.env.example` sao apenas para desenvolvimento.
- Nao use os valores locais em producao.
- O bootstrap local nao sobrescreve `.env` existente.
- O bootstrap local so continua se o Docker Desktop estiver pronto e `DATABASE_URL` estiver preenchida.
- Nao use `npx prisma` sem versao fixa neste projeto.
