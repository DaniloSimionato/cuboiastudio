# Staging Test Report

Data da execução: 8 de julho de 2026

## Preparação prática do staging

Status desta rodada: `pendente de valores reais e URL compartilhada`

O repositório ficou alinhado para execução prática com os seguintes ajustes finais:

- `NODE_ENV=staging` agora é aceito explicitamente pelo backend
- CORS trata `staging` com o mesmo travamento de `production`
- `env.staging.example` foi atualizado para refletir staging real
- `docker-compose.staging.yml` passou a ler `.env.staging`, evitando uso acidental do arquivo de exemplo
- `staging:bootstrap-admin` foi ajustado para um script CommonJS executável após o build da API

O que ainda depende do operador do ambiente:

- preencher `.env.staging` com secrets e URLs reais
- subir a infraestrutura compartilhada
- informar a URL final do staging para registrar neste relatório

## Validação prática local

URL usada nesta rodada:

- `http://localhost:3011`

Objetivo desta execução:

- validar bootstrapável de um ambiente novo fora do banco local legado
- confirmar signed headers em `NODE_ENV=staging`
- executar smoke multiempresa ponta a ponta sem `x-dev-company-id`

Correções encontradas durante a execução:

- `20260708103000_multi_company_onboarding` falhava em banco limpo porque usava `ON CONFLICT ("userId", "companyId")` antes de criar o índice único; a ordem da migration foi corrigida
- `staging:bootstrap-admin` não executava no app `commonjs`; foi substituído por um script CommonJS estável
- `POST /companies/active` respondia `201`; foi alinhado para `200`, compatível com troca de contexto

Empresas criadas nesta validação local:

- `Empresa Bootstrap Staging`
- `Smoke 1783519527204-c2ca22d7 A`
- `Smoke 1783519527204-c2ca22d7 B`

Observação:

- execuções anteriores de smoke local também criaram tenants de teste adicionais no mesmo banco local de validação; isso não afeta o isolamento e não deve ser replicado em staging compartilhado

## Resumo executivo

Status recomendado: `liberado para teste interno`

Justificativa:

- autenticação assinada em staging validada
- replay protegido por timestamp com janela configurável
- isolamento multiempresa coberto por testes
- `test:apps` verde
- `test:chatwoot` verde
- backend build/typecheck verdes

Pendência restante:

- `npx tsc --noEmit` ainda falha por erros antigos do frontend fora do escopo direto do onboarding multiempresa/staging

## Comandos executados

```bash
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run typecheck
npm --prefix apps/api run build
node --test apps/api/test/companies-multi-tenant.test.mjs apps/api/test/auth-guard-trusted-headers.test.mjs
npm --prefix apps/api run test:apps
npm --prefix apps/api run test:chatwoot
npx tsc --noEmit
```

Comandos executados nesta validação prática local:

```bash
cp env.staging.example .env.staging
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.staging.yml up -d postgres redis
set -a
source .env.staging
set +a
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run build
npm --prefix apps/api run staging:bootstrap-admin -- \
  --user-id=staging-smoke-admin \
  --company-id=company_staging_bootstrap \
  --email=staging-admin@cubo.local \
  --name="Staging Smoke Admin" \
  --company-name="Empresa Bootstrap Staging" \
  --legal-name="Empresa Bootstrap Staging LTDA"
API_URL=http://localhost:3011 \
AUTH_PROXY_SHARED_SECRET=*** \
STAGING_SMOKE_AUTH_USER_ID=staging-smoke-admin \
STAGING_SMOKE_AUTH_USER_EMAIL=staging-admin@cubo.local \
STAGING_SMOKE_AUTH_USER_NAME="Staging Smoke Admin" \
npm run smoke:staging
npm run build
```

## Resultado por comando

- `npm --prefix apps/api run prisma:generate`: ok
- `npm --prefix apps/api run typecheck`: ok
- `npm --prefix apps/api run build`: ok
- `node --test apps/api/test/companies-multi-tenant.test.mjs apps/api/test/auth-guard-trusted-headers.test.mjs`: ok
- `npm --prefix apps/api run test:apps`: ok
- `npm --prefix apps/api run test:chatwoot`: ok
- `npx tsc --noEmit`: falha

## Testes corrigidos nesta rodada

### `npm --prefix apps/api run test:apps`

Corrigido:

- adaptação do runtime para fallback seguro quando `IntentRouterService`, `PromptCompilerService` ou `AssistantKnowledgeRetrievalService` não estão injetados em suites antigas
- compatibilidade com aliases legados de tool names de calendário
- atualização dos testes antigos de calendário para o contrato atual em `snake_case`

Resultado final:

- toda a suite `test/app-store.test.mjs`
- toda a suite `test/assistant-calendar-tools.test.mjs`

### `npm --prefix apps/api run test:chatwoot`

Corrigido:

- webhook agora ignora loops óbvios antes de resolver tenant/config
- webhook não aborta mais com `AI_ACTIVE_UNKNOWN` quando o status ainda não é conhecido
- validação de `conversationId` volta a acontecer cedo, com erro controlado
- runtime legado de testes passa a suportar dependências opcionais sem quebrar
- expectativa de teste outbound alinhada com o payload atual seguro do Chatwoot

Resultado final:

- toda a suite `test/chatwoot-webhook-and-runtime.test.mjs`

## Autenticação signed-headers

### Replay protection

Existe proteção contra replay via `x-auth-timestamp`.

O backend:

1. parseia `x-auth-timestamp`
2. compara com o relógio atual
3. rejeita a requisição se a diferença passar da janela configurada

### Janela de tolerância

Default atual:

- `AUTH_PROXY_SIGNATURE_TTL_MS=300000`

Isso significa tolerância de 5 minutos.

### Exposição de segredo

`AUTH_PROXY_SHARED_SECRET` não é exposto ao frontend.

Evidências:

- não existe variável `VITE_AUTH_PROXY_SHARED_SECRET`
- o secret só aparece nas variáveis server-side
- o frontend usa apenas a URL da API; a assinatura é responsabilidade do proxy/camada auth

### Fluxo documentado de staging

Fluxo esperado:

1. usuário acessa o frontend de staging
2. a camada de auth/proxy autentica o usuário
3. o proxy injeta:
   - `x-auth-user-id`
   - `x-auth-user-email`
   - `x-auth-user-name`
   - `x-auth-timestamp`
   - `x-auth-signature`
4. a API valida a assinatura HMAC e a janela do timestamp
5. a API carrega o usuário persistido, memberships, roles e empresa ativa

O que ainda falta para produção real:

- a implementação concreta do proxy confiável fora do repositório
- configuração da borda/gateway para assinar os headers com o mesmo `AUTH_PROXY_SHARED_SECRET`

## Smoke de staging

O smoke já está preparado para rodar com headers assinados por env local controlado.

Arquivo:

- [scripts/smoke-staging.mjs](/Users/danilosimionato/Projetos/CuboIAStudio/scripts/smoke-staging.mjs)

Variáveis esperadas:

- `API_URL`
- `AUTH_PROXY_SHARED_SECRET`
- `STAGING_SMOKE_AUTH_USER_ID`
- `STAGING_SMOKE_AUTH_USER_EMAIL`
- `STAGING_SMOKE_AUTH_USER_NAME`

Cobertura atual do smoke:

- `health`
- autenticação
- listagem de empresas
- criação de empresa teste
- troca de empresa ativa
- criação de assistente
- criação de knowledge
- criação de flow
- envio de mensagem
- leitura de logs
- isolamento entre duas empresas

Resultado mais recente desta rodada:

```json
{
  "ok": true,
  "runId": "1783519527204-c2ca22d7",
  "companyAId": "cmrc5h6w200cgxz3ziwgdr228",
  "companyBId": "cmrc5h6ya00fcxz3zsll23ftp",
  "assistantId": "cmrc5h70500i9xz3zrs24tljt",
  "conversationId": "cmrc5h71q00ifxz3znujz3q93",
  "createdCompanyCountBefore": 7,
  "createdCompanyCountAfter": 9
}
```

## O que bloqueia staging

Bloqueadores atuais:

- nenhum no backend para staging interno controlado
- ainda falta uma URL pública compartilhada com proxy/auth real para concluir a validação do staging externo da equipe

## O que não bloqueia staging

- erros antigos de `npx tsc --noEmit` no frontend fora do fluxo de Companies/Auth/tenant switch

Detalhamento:

- ver [docs/FRONTEND_TYPECHECK_REPORT.md](/Users/danilosimionato/Projetos/CuboIAStudio/docs/FRONTEND_TYPECHECK_REPORT.md)

## Observações importantes

- Há um log esperado na suite de Chatwoot simulando falha de persistência com `Unknown argument encryptedValue`; o teste passa porque valida o tratamento amigável do erro. Não é falha residual da suíte.
- O fluxo atual de signed headers está pronto no backend, mas depende de proxy confiável real para um staging externo.
- A validação manual completa de frontend com login real, seletor de empresa e navegação autenticada continua pendente até existir um domínio/proxy compartilhado injetando os headers assinados.

## Recomendação final

Status recomendado neste momento:

- `liberado para teste interno controlado`

Interpretação prática:

- o código e o pacote operacional já permitem subir um staging-like local isolado com smoke aprovado
- para liberar a equipe em um ambiente compartilhado externo, falta apenas preencher secrets reais, publicar a URL final e conectar a camada de autenticação/proxy confiável
