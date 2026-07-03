# AUTH.md

## Objetivo do auth

A camada de autenticação e autorização do Cubo AI Studio existe para preparar o backend para um cenário real de produção, com isolamento por empresa, permissões por rota e contexto confiável da requisição.

Nesta fase, não existe login real.

## Diferença entre auth de desenvolvimento e produção

### Desenvolvimento

Em ambiente de desenvolvimento, o backend aceita headers de teste para simular um usuário autenticado sem usar senha, token falso ou qualquer segredo.

### Produção

Em produção, o mock de autenticação é bloqueado.

Isso significa que nenhuma requisição deve depender dos headers de desenvolvimento para funcionar fora do ambiente local.

## Headers de desenvolvimento

Os headers abaixo são aceitos apenas quando `NODE_ENV !== "production"`:

- `x-dev-user-id`
- `x-dev-company-id`
- `x-dev-user-email`

Headers opcionais para testes locais:

- `x-dev-user-name`
- `x-dev-user-roles`
- `x-dev-user-permissions`

Esses headers existem somente para facilitar o desenvolvimento local e a validação técnica de rotas protegidas.

## Estrutura do usuário autenticado

O contexto autenticado segue a estrutura abaixo:

- `id`
- `companyId`
- `email`
- `name`
- `roles`
- `permissions`

Esse payload é o formato mínimo para futuras rotas do backend consumirem o contexto do usuário.

## Permissões

Permissões são declaradas via decorator `@RequirePermissions(...)`.

Se uma rota não declarar permissão, ela apenas exige usuário autenticado.

Quando permissões forem declaradas, o backend deve validar o conjunto exigido antes de executar a rota.

## RBAC persistido

Nesta fase, o Cubo AI Studio já possui um RBAC mínimo persistido no banco para desenvolvimento.

O fluxo é:

1. o seed cria company, usuário, roles e permissões
2. o `AuthGuard` tenta carregar o usuário no banco usando `x-dev-user-id` e `x-dev-company-id`
3. se o usuário existir, as roles e permissões vêm do banco
4. se a busca falhar em ambiente não-produção, o backend continua com fallback dos headers de desenvolvimento

Isso permite testar permissões reais sem implementar login.

## Seed de desenvolvimento

O seed cria os seguintes dados base:

- 1 company demo
- 1 user demo
- roles:
  - `admin`
  - `implantation`
  - `support`
  - `viewer`
- permissões iniciais:
  - `assistants:read`
  - `assistants:write`
  - `knowledge:read`
  - `knowledge:write`
  - `tools:read`
  - `tools:write`
  - `channels:read`
  - `channels:write`
  - `logs:read`
  - `usage:read`
  - `settings:read`
  - `settings:write`

O usuário demo é associado à role `admin`.

## Permissão usada em Assistentes

A primeira rota real de listagem de assistentes usa:

- `assistants:read`

Ela é a permissão base para consultar assistentes do tenant atual.

A rota de criação de assistentes usa:

- `assistants:write`

Ela é a permissão base para criar assistentes do tenant atual sem permitir acesso a outro tenant.

A mesma permissão também é usada para editar assistentes, mantendo o mesmo controle de tenant e RBAC.

A mesma permissão também é usada para alterar o status do assistente, sem misturar esse fluxo com o `PATCH /assistants/:id`.

As rotas iniciais de knowledge manual do assistant também reutilizam:

- `assistants:read` para listagem
- `assistants:write` para criação

Isso mantém o modelo de autorização simples enquanto o domínio de knowledge ainda está em fase inicial.

As rotas de edição e remoção de knowledge manual também usam:

- `assistants:write`

A remoção é lógica por `status: INACTIVE`, mantendo a regra de tenant e evitando expor recursos de outro tenant.

A rota de preview determinístico do assistant usa:

- `assistants:read`

Ela apenas simula uma resposta usando knowledge ativa e não representa um fluxo real de IA ou integração externa.

A rota de runtime determinístico do assistant também usa:

- `assistants:read`

Ela reaproveita a mesma base de conhecimento manual ativa, persiste a execução em log com `mode: deterministic-runtime` e continua sem chamar IA real ou APIs externas.

As rotas de configuração de IA por tenant usam:

- `settings:read` para `GET /settings/ai` e `GET /diagnostics/ai`
- `settings:write` para `PATCH /settings/ai`, `POST /settings/ai/test` e `DELETE /settings/ai/api-key`

Essas rotas também continuam protegidas por `AuthGuard`, `PermissionsGuard`, `@CurrentUser()` e `@Tenant()`.

A listagem de logs de preview determinístico também usa:

- `assistants:read`

Esses logs são usados para auditoria e evolução futura do runtime determinístico, sem expor headers, tokens ou dados sensíveis. A listagem também pode conter execuções de preview e runtime, diferenciadas pelo campo `mode`.

As conversas iniciais do runtime usam as permissões existentes de Assistentes:

- `assistants:read` para listar conversas e mensagens
- `assistants:write` para criar conversas e enviar mensagens

Isso mantém o controle de tenant e RBAC igual ao restante do módulo de Assistants enquanto o runtime determinístico ainda está em fase inicial.

## Tenant e companyId

O `companyId` representa a empresa ativa da requisição.

Ele é disponibilizado por meio do decorator `@Tenant()` e também fica anexado ao contexto autenticado.

Isso prepara o backend para multiempresa desde as primeiras rotas protegidas.

## Como validar RBAC localmente

A validação técnica principal do RBAC local fica no endpoint:

- `GET /diagnostics/rbac`

Esse endpoint exige:

- `AuthGuard`
- `PermissionsGuard`
- `@RequirePermissions("settings:read")`

### Como testar `401`

Faça a chamada sem headers de desenvolvimento.

```bash
curl http://localhost:3001/diagnostics/rbac
```

Resultado esperado: `401 Unauthorized`.

### Como testar `403`

Faça a chamada com um usuário dev válido, mas sem a permissão `settings:read`.

```bash
curl \
  -H "x-dev-user-id: user_sem_permissao" \
  -H "x-dev-company-id: company_demo_cubo_ai_studio" \
  -H "x-dev-user-email: no-permission@cubo.chat" \
  http://localhost:3001/diagnostics/rbac
```

Resultado esperado: `403 Forbidden`.

### Como testar `200`

Faça a chamada com o usuário seedado.

```bash
curl \
  -H "x-dev-user-id: user_demo_cubo_ai_studio" \
  -H "x-dev-company-id: company_demo_cubo_ai_studio" \
  -H "x-dev-user-email: demo@cubo.chat" \
  http://localhost:3001/diagnostics/rbac
```

Resultado esperado: `200 OK` com:

- `user`
- `tenant`
- `requiredPermission: "settings:read"`

## Diagnóstico de IA

O diagnóstico seguro do provider de IA fica em:

- `GET /diagnostics/ai`
- `POST /diagnostics/ai/test`

Essas rotas também exigem:

- `AuthGuard`
- `PermissionsGuard`
- `@RequirePermissions("settings:read")`

### O que elas validam

- o status da configuração de IA sem expor segredo
- o teste manual opcional do provider quando ele estiver habilitado
- o fallback determinístico quando a IA real estiver desabilitada

### Regras de segurança

- a API key nunca aparece na resposta
- a API key nunca aparece no Swagger
- a API key nunca aparece em logs
- a IA real ainda não está ligada ao runtime `/testes`
- a configuração por tenant fica salva de forma criptografada no backend

### Configuração por tenant

O tenant pode ler, salvar, testar e remover sua própria configuração de IA em:

- `GET /settings/ai`
- `PATCH /settings/ai`
- `POST /settings/ai/test`
- `DELETE /settings/ai/api-key`

Essas rotas exigem `settings:read` ou `settings:write` conforme o caso, e nunca retornam API key em claro.

## Primeira rota real de domínio

A primeira rota real de domínio que segue o mesmo padrão validado no diagnóstico é:

- `GET /companies/current`

Ela usa:

- `AuthGuard`
- `PermissionsGuard`
- `@RequirePermissions("settings:read")`
- `@CurrentUser()`
- `@Tenant()`

Essa rota confirma a integração entre RBAC e tenant em uma operação de domínio real, sem expor credenciais ou dados sensíveis.

## O que ainda não foi implementado

- login real
- logout real
- refresh token
- recuperação de senha
- integração com Cubo.Chat
- login com token real
- sessões persistidas
- tokens reais
- qualquer uso de localStorage

## Diferença entre auth dev e auth futura real

Hoje o auth de desenvolvimento existe apenas para liberar a validação técnica do backend.

A auth real futura deverá substituir os headers de desenvolvimento por um fluxo seguro de sessão ou token, com persistência, expiração, revogação e auditoria.

## Regra importante

O auth atual existe apenas como fundação técnica para desenvolvimento e para preparar o backend.

Nenhuma decisão de autenticação deve ser tratada como definitiva até a implementação do fluxo real de login.

## Logs de IA

Os logs seguros de runtime ficam em:

- `GET /logs/ai`
- `GET /logs/ai/:id`

Essas rotas exigem:

- `AuthGuard`
- `PermissionsGuard`
- `@RequirePermissions("logs:read")`
- `@CurrentUser()`
- `@Tenant()`

Os endpoints sempre filtram por `companyId` do tenant atual e retornam somente metadados seguros. Eles nunca retornam API key, headers, authorization, prompt completo, body bruto do provider ou resposta bruta completa.
