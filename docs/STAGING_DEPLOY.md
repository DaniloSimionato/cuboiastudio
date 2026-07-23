# Staging Deploy

Guia operacional para subir o Cubo AI Studio em ambiente de homologação/staging, fora da máquina local.

## Objetivo

Permitir que a equipe teste empresas reais de homologação com isolamento por `companyId`, sem depender de `x-dev-company-id` e sem usar mocks como se fossem integrações reais.

## Arquitetura mínima

Serviços obrigatórios hoje:

- frontend buildado do app TanStack/Vite
- API NestJS
- Postgres
- Redis
- proxy/autenticação confiável na frente da API
- URL pública estável para webhooks do Chatwoot/CuboChat

Serviços opcionais/observações:

- worker dedicado: não existe worker separado no repositório hoje
- domínio público ou tunnel:
  - preferencial: domínio/subdomínio fixo
  - temporário: Cloudflare Tunnel ou ngrok

## Variáveis de ambiente

### API / backend

Obrigatórias para staging:

- `NODE_ENV=staging`
- `PORT`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `APP_ENCRYPTION_KEY`
- `AUTH_TRUST_MODE=signed-headers`
- `AUTH_PROXY_SHARED_SECRET`
- `AUTH_PROXY_SIGNATURE_TTL_MS`

IA / provider:

- `AI_RUNTIME_ENABLED`
- `AI_PROVIDER`
- `AI_BASE_URL`
- `AI_MODEL`
- `AI_API_KEY`
- `AI_REQUEST_TIMEOUT_MS`
- `ASSISTANT_KNOWLEDGE_MIN_SCORE_OVERRIDES` (opcional; formato `assistant-id:0.55`; valor aprovado: `cmrcunljc008rrq01d7urn2t5:0.55`)
- `KNOWLEDGE_SCOPE_TAG_FILTER_ASSISTANT_IDS` (opcional; allowlist de assistants para ativar o filtro por tags)
- `OPENAI_API_KEY` se usar OpenAI diretamente
- `ANTHROPIC_API_KEY` se usar Anthropic diretamente

Chatwoot:

- `CHATWOOT_URL`
- `CHATWOOT_TOKEN`
- `CHATWOOT_ALLOW_INSECURE_WEBHOOKS=false`
- `CHATWOOT_ATTACHMENT_DOWNLOAD_TIMEOUT_MS`
- `CHATWOOT_ATTACHMENT_MAX_IMAGE_BYTES`
- `CHATWOOT_ATTACHMENT_MAX_AUDIO_BYTES`
- `CHATWOOT_ATTACHMENT_MAX_VIDEO_BYTES`
- `CHATWOOT_ATTACHMENT_MAX_DOCUMENT_BYTES`

Google OAuth:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`

### Frontend

Em produção o cliente usa `/api` por padrão para falar com a API.

Se a tela de Configurações precisar exibir instruções com URL pública do webhook, vale configurar uma destas:

- `VITE_PUBLIC_API_URL`
- `VITE_APP_PUBLIC_API_URL`
- `VITE_API_PUBLIC_URL`

Em desenvolvimento local continua existindo:

- `VITE_API_URL`

### Auth / staging

No código atual, staging/produção não deve usar `x-dev-user-id` nem `x-dev-company-id`.

O backend espera identidade autenticada do ambiente por headers confiáveis assinados:

- `x-auth-user-id`
- `x-auth-user-email`
- `x-auth-user-name` opcional
- `x-auth-timestamp`
- `x-auth-signature`

Isso significa que o ambiente precisa ter um proxy, gateway ou camada de autenticação que:

1. autentique o usuário
2. injete esses headers
3. assine o payload com o mesmo `AUTH_PROXY_SHARED_SECRET` da API

Sem isso, a API responde `401`.

## Regras críticas

- staging não pode depender de `x-dev-company-id`
- staging não pode confiar em `x-auth-*` vindos diretamente do navegador sem assinatura do proxy
- staging não pode usar dados mockados como se fossem integrações reais
- tokens, API keys, webhook secrets e credenciais OAuth devem ficar só em env ou persistidos cifrados no backend
- logs não devem expor tokens, `Authorization`, cookies ou segredos
- cada empresa deve operar isolada por `companyId`

## Arquivos de apoio

Este repositório agora inclui:

- [env.staging.example](/Users/danilosimionato/Projetos/CuboIAStudio/env.staging.example)
- [docker-compose.staging.yml](/Users/danilosimionato/Projetos/CuboIAStudio/docker-compose.staging.yml)
- [apps/api/scripts/bootstrap-staging-admin.js](/Users/danilosimionato/Projetos/CuboIAStudio/apps/api/scripts/bootstrap-staging-admin.js)
- [scripts/smoke-staging.mjs](/Users/danilosimionato/Projetos/CuboIAStudio/scripts/smoke-staging.mjs)

Antes de subir o ambiente:

```bash
cp env.staging.example .env.staging
```

Edite o arquivo `.env.staging` com os valores reais do ambiente compartilhado. O `docker-compose.staging.yml` já lê esse arquivo por padrão.

Se for rodar API, migrations ou bootstrap diretamente no host, exporte as variáveis antes do comando:

```bash
set -a
source .env.staging
set +a
```

## Deploy checklist

### 1. Banco e cache

1. Subir Postgres.
2. Subir Redis.
3. Confirmar conectividade de `DATABASE_URL`.
4. Confirmar conectividade de `REDIS_URL`.

### 2. Backend

1. Instalar dependências.
2. Gerar Prisma Client:

```bash
npm --prefix apps/api run prisma:generate
```

3. Aplicar migrations:

```bash
npm --prefix apps/api run prisma:migrate
```

4. Buildar API:

```bash
npm --prefix apps/api run build
```

5. Subir API:

```bash
npm --prefix apps/api run start
```

6. Criar o primeiro admin:

```bash
npm --prefix apps/api run staging:bootstrap-admin -- \
  --email=admin@empresa-teste.com \
  --name="Admin Staging" \
  --company-name="Empresa Teste" \
  --legal-name="Empresa Teste LTDA"
```

### 3. Frontend

1. Instalar dependências.
2. Gerar build:

```bash
npm run build
```

3. Servir o build atrás do mesmo domínio da API ou com proxy `/api`.

Se quiser subir um pacote local de staging rapidamente:

```bash
docker compose -f docker-compose.staging.yml up -d postgres redis
set -a
source .env.staging
set +a
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run build
npm run build
```

Para um smoke local com headers assinados sem depender do proxy externo:

```bash
API_URL=http://localhost:3001 \
AUTH_PROXY_SHARED_SECRET="$AUTH_PROXY_SHARED_SECRET" \
STAGING_SMOKE_AUTH_USER_ID=staging-smoke-admin \
STAGING_SMOKE_AUTH_USER_EMAIL=staging-admin@empresa-teste.com \
STAGING_SMOKE_AUTH_USER_NAME="Staging Smoke Admin" \
npm run smoke:staging
```

### 4. Auth

1. Garantir que o ambiente injete `x-auth-user-id` e `x-auth-user-email`.
2. Garantir que ele também injete `x-auth-timestamp` e `x-auth-signature`.
3. Não liberar headers `x-dev-*` como estratégia de staging.

### 5. Seed

O seed atual é de desenvolvimento e cria dados demo.

Para staging:

- não rodar seed demo automaticamente em ambiente compartilhado, a menos que isso seja intencional
- se precisar seedar permissões base, fazer isso de forma controlada
- não popular empresas de teste antigas como se fossem tenants reais

## Checklist de operação inicial

### Primeiro acesso

1. Criar ou sincronizar o primeiro usuário admin no ambiente autenticado.
2. Confirmar que ele chega na API com `x-auth-user-id`, `x-auth-user-email`, `x-auth-timestamp` e `x-auth-signature`.
3. Confirmar que o usuário consegue abrir `GET /companies`.

### Primeira empresa

1. Abrir `Configurações`.
2. Criar a primeira empresa em `Administração de empresas`.
3. Entrar nela.
4. Confirmar que o tenant nasceu vazio:
   - sem assistentes
   - sem Chatwoot
   - sem Google Agenda
   - sem knowledge
   - sem conversas

### Chatwoot

1. Configurar inbox da empresa.
2. Salvar `apiAccessToken` e `webhookSecret`.
3. Configurar o webhook público:

```text
https://SUA_URL_PUBLICA/webhooks/chatwoot?secret=SEU_SECRET
```

4. Validar teste de conexão da inbox.
5. Enviar mensagem real de teste.
6. Confirmar:
   - webhook recebido
   - conversa criada no tenant correto
   - resposta enviada
   - logs presentes

### Google Agenda

1. Configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_CALENDAR_REDIRECT_URI`.
2. Conectar a conta Google pela tela de apps.
3. Mapear o calendário/recurso.
4. Validar:
   - status OAuth conectado
   - listagem de calendários
   - recurso salvo no tenant correto
   - disponibilidade e reserva funcionando

## Como cadastrar uma nova empresa para teste

1. Entrar com usuário admin.
2. Ir em `Configurações`.
3. Abrir `Administração de empresas`.
4. Clicar em `Nova empresa`.
5. Preencher:
   - nome fantasia
   - razão social opcional
   - CNPJ opcional
   - status
   - observações
6. Deixar `Criar assistente demo` desligado, a menos que queira um tenant com exemplo explícito.
7. Salvar.
8. Trocar para a empresa criada.
9. Fazer o setup do zero dentro dela.

## Validação final de staging

- API responde com sucesso
- frontend abre sem apontar para localhost
- usuário autenticado não depende de headers dev
- headers `x-auth-*` são assinados por proxy confiável
- `GET /companies/current` resolve a empresa ativa
- empresa A não vê dados da empresa B
- Chatwoot da empresa A não usa segredos ou inbox da empresa B
- Google Agenda da empresa A não lista recursos da empresa B
- logs não exibem tokens nem secrets

## Troubleshooting

### A API sobe, mas a UI não carrega dados

Verificar:

- `CORS_ORIGIN`
- proxy `/api` do frontend
- headers autenticados `x-auth-user-id`, `x-auth-user-email`, `x-auth-timestamp` e `x-auth-signature`

### Não consigo salvar Chatwoot ou Google Agenda

Verificar:

- `APP_ENCRYPTION_KEY`

Ela precisa ser uma chave de 32 bytes em hex ou base64.

### OAuth do Google falha

Verificar:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- URL cadastrada no console do Google exatamente igual à URL pública usada no staging

### Webhook do Chatwoot não chega

Verificar:

- URL pública realmente acessível
- `?secret=...` correto
- tunnel/domínio ainda ativo
- webhook salvo no Chatwoot apontando para a URL atual

### A mensagem chega, mas o tenant está errado

Verificar:

- `accountId` + `inboxId` da configuração Chatwoot
- empresa ativa usada ao salvar a inbox
- se existe alguma configuração duplicada antiga

### Tokens sensíveis aparecem em logs

Isso deve ser tratado como incidente.

Ação imediata:

1. Rotacionar o segredo exposto.
2. Revisar logs do backend.
3. Verificar se a aplicação está rodando com build correto e sem patches locais inseguros.

## Comandos úteis

Backend:

```bash
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run build
npm --prefix apps/api run start
npm --prefix apps/api run staging:bootstrap-admin -- --email=admin@empresa-teste.com --name="Admin Staging" --company-name="Empresa Teste"
```

Frontend:

```bash
npm run build
npm run preview
npm run smoke:staging
```

## Observações finais

- O seed atual é voltado a desenvolvimento local.
- O ambiente de staging deve preferir dados mínimos e empresas criadas manualmente.
- O multiempresa agora depende da empresa ativa persistida no usuário e de memberships, não de `x-dev-company-id`.
