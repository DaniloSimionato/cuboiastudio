# Staging Validation Checklist

## Subida inicial

1. Configurar `env.staging.example` com URLs públicas, secrets e OAuth.
2. Subir Postgres e Redis.
3. Rodar `npm --prefix apps/api run prisma:generate`.
4. Rodar `npm --prefix apps/api run prisma:migrate`.
5. Rodar `npm --prefix apps/api run build`.
6. Rodar `npm run build`.
7. Subir API e frontend.
8. Configurar proxy autenticado com headers assinados `x-auth-*`.

## Primeiro acesso

1. Rodar `npm --prefix apps/api run staging:bootstrap-admin -- --email=admin@empresa-teste.com --name="Admin Staging" --company-name="Empresa Teste"`.
2. Entrar no frontend de staging.
3. Confirmar `GET /auth/me` com usuário e empresa ativa corretos.
4. Confirmar `GET /companies` retornando só empresas vinculadas.

## Checklist por empresa

1. Criar empresa.
2. Entrar na empresa.
3. Confirmar tenant vazio.
4. Criar assistente.
5. Configurar prompt.
6. Adicionar conhecimento.
7. Criar fluxo.
8. Testar conversa manual.
9. Conectar Chatwoot.
10. Testar conversa real.
11. Configurar Google Agenda.
12. Verificar logs.
13. Trocar para outra empresa e validar isolamento.

## Smoke automatizado

```bash
API_URL=https://api-staging.example.com \
AUTH_PROXY_SHARED_SECRET=replace-with-shared-secret \
STAGING_SMOKE_AUTH_USER_ID=user_123 \
STAGING_SMOKE_AUTH_USER_EMAIL=admin@empresa-teste.com \
STAGING_SMOKE_AUTH_USER_NAME="Admin Staging" \
npm run smoke:staging
```

## Sinais de bloqueio

- API aceita `x-dev-*` em staging.
- API aceita `x-auth-*` sem assinatura válida.
- Empresa nova nasce com assistentes ou integrações copiadas.
- Usuário de empresa A lista ou abre dado da empresa B.
- Logs exibem tokens, refresh tokens, cookies ou segredos.
