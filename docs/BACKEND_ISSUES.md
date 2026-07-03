# BACKEND_ISSUES.md

Plano de execução em epics e issues priorizadas para transformar o backlog do backend em tarefas pequenas, seguras e executáveis com Codex.

## Regras gerais de execução

- Sempre implementar uma issue por vez.
- Antes de implementar, ler os documentos relevantes.
- Nunca expor secrets no frontend.
- Nunca conectar API externa diretamente pelo frontend.
- Sempre rodar typecheck, build e testes ao final.
- Sempre atualizar a documentação da fase quando necessário.
- Nunca implementar funcionalidades fora do escopo da issue.
- Preferir simplicidade no MVP.
- Se uma issue depender de decisão em aberto, parar e documentar antes de avançar.

## Proximas issues

- AI-007 - Logs e observabilidade de IA.
- BE-022 - CRUD inicial de Tools, como issue canonical da fase de tools/functions.
- A numeração a partir de BE-024 segue a fila ajustada para as próximas entregas ainda não implementadas.

## Integração frontend

- APP-001 - Frontend conectado ao backend local para demo funcional.
- As telas já conectadas consomem empresa atual, assistants, knowledge, preview, runtime e conversas persistidas.
- As demais telas permanecem mockadas até que exista uma issue própria para a conexão de cada fluxo.
- APP-002 - QA visual e estabilização da demo local.
- Nesta etapa o frontend passou a tratar melhor erros de rede, o backend aceitou as origens locais comuns do Vite e as telas demonstrativas de Ferramentas e Flow Builder foram estabilizadas sem alterar o estilo visual.

## Sequencia de produto para o cerebro da IA

O backlog de backend continua sendo a fila de implementacao funcional, mas a prioridade de produto para o cerebro da IA passa a ser:

1. AI-000 - Plano tecnico do cerebro da IA
2. AI-001 - Provider de IA real
3. AI-002 - Prompt e instrucoes do assistente
4. AI-003 - Runtime real de conversa
5. AI-004 - Configuracao de IA por tenant/empresa
6. AI-005 - Runtime Pipeline v1 baseado nas 7 partes do Assistente
7. AI-006 - Contexto de conversa v1 com historico/persona
8. AI-007 - Logs e observabilidade de IA
9. AI-008 - Knowledge e RAG simples
10. BE-022 - CRUD inicial de Tools
11. AI-009 - Canais externos

AI-002 ja foi concluida nesta entrega e agora faz parte da base persistida do assistant.
AI-003 ja foi concluida nesta entrega e agora usa provider real com fallback deterministico.
AI-004 agora cobre a configuracao de IA por tenant/empresa, com chave cifrada e fallback global.
AI-004 FIX corrigiu o fluxo de salvar/testar configuracao de IA: `400` agora deve exibir mensagem clara, `/settings/ai/options` fornece presets seguros de OpenAI/DeepSeek/Custom, e o teste de conexao exige configuracao salva.
AI-004 FIX 2 melhorou o diagnostico de erro do provider em `POST /settings/ai/test`, retornando `providerStatus` e `providerError` sanitizados quando o provider rejeitar a chamada.
AI-005 organiza o runtime de conversa como Pipeline v1 com 7 partes: `initialMessage`, instrucoes, contexto/fontes, modelo/temperatura, inatividade conceitual, saida simples (`success`/`fallback`) e resumo deterministico da execucao.
AI-005 FIX estabiliza o laboratorio `/testes`: troca de assistant limpa conversa/debug antigos, conversa inexistente recebe mensagem amigavel, `runtime.reason` fica mais claro em fallback, e artifacts do smoke usam `[SMOKE]` e sao inativados ao final.
AI-006 melhora o contexto de conversa: prompt do provider recebe identidade do assistant, descricao, mensagem inicial, instrucoes/persona, knowledge ativa, historico recente limitado e mensagem atual; o runtime retorna `context` para debug em `/testes`.

Essas etapas nao alteram a numeracao das issues concluídas. Elas apenas deixam claro que Tools continua importante, mas vem depois do nucleo de IA real existir.

## Epic 1. Preparação do backend

### BE-001 - Definir stack backend

- Prioridade: P0
- Objetivo: escolher runtime, framework, padrão de projeto e forma de execução do backend.
- Arquivos prováveis: `docs/BACKEND_BACKLOG.md`, `docs/BACKEND_ISSUES.md`, futura pasta `backend/README.md`.
- Tarefas:
  - validar stack inicial
  - definir estrutura monolito modular ou API separada
  - registrar decisão em documento
- Critérios de aceite:
  - stack escolhida e documentada
  - caminho de execução definido
- Testes esperados: nenhuma implementação ainda, apenas validação documental.
- Observações de segurança: a escolha deve privilegiar segregação por empresa e suporte a secrets no backend.

Implementação realizada nesta etapa:

- estrutura inicial do backend criada em `apps/api`
- NestJS preparado com `AppModule` e `HealthModule`
- healthcheck `GET /health` implementado
- Swagger configurado
- logger baseado em Pino configurado
- `ValidationPipe` global configurado
- tratamento global de erros configurado
- CORS configurado
- validação de ambiente preparada
- `.env.example` criado com variáveis vazias
- estrutura reservada para módulos futuros criada

### BE-002 - Criar estrutura inicial do backend

- Prioridade: P0
- Objetivo: preparar o esqueleto mínimo do projeto backend sem regras de negócio.
- Arquivos prováveis: futura pasta `backend/` ou `apps/api/`.
- Tarefas:
  - criar estrutura base de pastas
  - definir entrypoint
  - definir módulos iniciais vazios
- Critérios de aceite:
  - projeto backend inicia sem erro
  - estrutura base está organizada
- Testes esperados: start local do backend.
- Observações de segurança: nenhum secret deve ser commitado.

Implementação realizada nesta etapa:

- Prisma instalado e configurado em `apps/api`
- schema inicial criado em `apps/api/prisma/schema.prisma`
- `DatabaseModule` criado em `apps/api/src/database/database.module.ts`
- `PrismaService` criado em `apps/api/src/database/prisma.service.ts`
- tabelas estruturais iniciais criadas: `companies`, `users`, `roles`, `permissions`, `user_roles`
- multiempresa considerada desde o schema inicial
- `docs/DATABASE.md` criado
- scripts Prisma adicionados ao `apps/api/package.json`
- `apps/api/src/app.module.ts` passou a importar `DatabaseModule`

Decisao importante:

- `DATABASE_URL` continua obrigatoria para subir a API
- nenhum dado sensivel foi adicionado ao codigo ou aos arquivos de configuracao

### BE-003 - Criar healthcheck e endpoint raiz

- Prioridade: P0
- Objetivo: expor healthcheck simples para validar deploy e observabilidade mínima.
- Arquivos prováveis: `backend/src/routes/health.ts`, `backend/src/app.ts`.
- Tarefas:
  - criar `GET /health`
  - criar endpoint raiz básico
  - retornar status consistente
- Critérios de aceite:
  - healthcheck responde 200
  - endpoint raiz identifica o serviço
- Testes esperados: teste de rota simples.
- Observações de segurança: resposta sem dados sensíveis.

Atualizacao de infraestrutura feita nesta entrega:

- migration inicial do schema atual criada em `apps/api/prisma/migrations/001_initial_identity_schema`
- guia de setup local criado em `docs/BACKEND_SETUP.md`
- compose local criado em `infra/docker-compose.local.yml`
- scripts de banco adicionados nos packages raiz e da API
- comando de validacao de conexao com o banco criado sem expor segredos

### BE-004 - Criar fundação de autenticação e contexto multiempresa

- Prioridade: P0
- Objetivo: criar a base de auth/tenant segura para desenvolvimento local e preparar RBAC.
- Arquivos prováveis: `apps/api/src/auth/*`, documentação da fase.
- Tarefas:
  - criar AuthGuard de desenvolvimento
  - criar decorators de usuário e tenant
  - criar PermissionsGuard
  - documentar headers de dev no Swagger
- Critérios de aceite:
  - `/auth/me` responde em desenvolvimento com headers
  - mock auth bloqueado em produção
  - nenhum segredo exposto
  - permissões podem ser declaradas por decorator
- Testes esperados: validação manual de `/auth/me` em dev.
- Observações de segurança: autenticação real permanece para etapas futuras.

Implementação realizada nesta etapa:

- `AuthModule` criado em `apps/api/src/auth/auth.module.ts`
- `AuthGuard` de desenvolvimento criado em `apps/api/src/auth/auth.guard.ts`
- `PermissionsGuard` criado em `apps/api/src/auth/permissions.guard.ts`
- decorators `CurrentUser`, `Tenant` e `RequirePermissions` criados
- `GET /auth/me` criado e protegido pelo `AuthGuard`
- Swagger documentando headers de desenvolvimento
- `app.module.ts` passou a importar `AuthModule`
- documentação de auth criada em `docs/AUTH.md`

## Epic 2. Banco de dados e multiempresa

### BE-005 - RBAC persistido básico para desenvolvimento

- Prioridade: P0
- Objetivo: persistir roles e permissões mínimas no banco para desenvolvimento local.
- Arquivos prováveis: `apps/api/prisma/seed.ts`, `apps/api/prisma/schema.prisma`, `apps/api/src/auth/auth.guard.ts`, documentação de auth.
- Tarefas:
  - criar seed seguro com company, user, roles, permissions e vínculos
  - adicionar suporte a `role_permissions`
  - fazer `AuthGuard` tentar carregar RBAC persistido no banco
- Critérios de aceite:
  - seed cria dados base sem senha ou token
  - `/auth/me` usa permissões persistidas quando o banco estiver disponível
  - fallback dev continua disponível fora de produção
- Testes esperados: seed local e validação manual de `/auth/me`.
- Observações de segurança: nenhum segredo pode ser introduzido no seed.

Implementação realizada nesta etapa:

- `role_permissions` adicionada ao schema Prisma
- seed de desenvolvimento criado em `apps/api/prisma/seed.ts`
- script `prisma:seed` adicionado em `apps/api/package.json`
- `AuthGuard` passou a tentar carregar usuário e permissões persistidas no banco
- documentação de auth atualizada com RBAC persistido
- documentação de database atualizada com `role_permissions`

### Validação técnica - RBAC e Tenant em rota protegida

- Prioridade: P0
- Objetivo: validar em uma rota técnica se `AuthGuard`, `PermissionsGuard`, `@RequirePermissions`, `@CurrentUser` e `@Tenant` funcionam juntos.
- Arquivos prováveis: `apps/api/src/diagnostics/*`, documentação de auth.
- Tarefas:
  - criar endpoint técnico protegido
  - documentar testes de `401`, `403` e `200`
  - expor contexto de usuário e tenant
- Critérios de aceite:
  - rota retorna `401` sem auth
  - rota retorna `403` sem permissão
  - rota retorna `200` com permissão válida
- Testes esperados: chamadas `curl` de validação local.
- Observações de segurança: rota técnica não pode expor segredos.

Implementação realizada nesta etapa:

- `DiagnosticsModule` criado em `apps/api/src/diagnostics/diagnostics.module.ts`
- `DiagnosticsController` criado em `apps/api/src/diagnostics/diagnostics.controller.ts`
- `GET /diagnostics/rbac` protegido com `AuthGuard` e `PermissionsGuard`
- documentação de validação local adicionada em `docs/AUTH.md`

### BE-006 - Criar primeira rota real de domínio usando Tenant + RBAC

- Prioridade: P0
- Objetivo: expor a empresa atual autenticada em uma rota real de domínio usando o mesmo padrão validado em diagnóstico.
- Arquivos prováveis: `apps/api/src/companies/*`, `docs/AUTH.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar módulo de companies
  - criar `GET /companies/current`
  - aplicar `AuthGuard`, `PermissionsGuard`, `@RequirePermissions`, `@CurrentUser()` e `@Tenant()`
- Critérios de aceite:
  - rota retorna company e user básicos
  - tenant é respeitado
  - rota continua protegida por RBAC
- Testes esperados: chamadas `curl` de `401`, `403` e `200`.
- Observações de segurança: não retornar secrets, tokens ou permissões completas.

Implementação realizada nesta etapa:

- `CompaniesModule` criado em `apps/api/src/companies/companies.module.ts`
- `CompaniesController` criado em `apps/api/src/companies/companies.controller.ts`
- `CompaniesService` criado em `apps/api/src/companies/companies.service.ts`
- `GET /companies/current` criado e protegido com `AuthGuard` e `PermissionsGuard`
- documentação de auth atualizada com a primeira rota real de domínio

### BE-007 - Criar módulo inicial de Assistentes IA com listagem por tenant

- Prioridade: P0
- Objetivo: disponibilizar a primeira rota real de listagem de assistants do tenant atual.
- Arquivos prováveis: `apps/api/src/assistants/*`, `apps/api/prisma/schema.prisma`, documentação de auth e database.
- Tarefas:
  - criar modelo mínimo de assistant
  - criar módulo/controller/service
  - criar `GET /assistants`
  - proteger por `AuthGuard`, `PermissionsGuard`, `@RequirePermissions`, `@CurrentUser()` e `@Tenant()`
- Critérios de aceite:
  - lista retorna apenas assistants do tenant atual
  - rota não expõe dados sensíveis
  - rota usa `assistants:read`
- Testes esperados: chamadas `curl` de `401`, `403` e `200`.
- Observações de segurança: não retornar prompts, tokens ou configurações internas.

Implementação realizada nesta etapa:

- `Assistant` adicionada ao schema Prisma
- migration inicial de assistants criada
- `AssistantsModule` criado em `apps/api/src/assistants/assistants.module.ts`
- `AssistantsController` criado em `apps/api/src/assistants/assistants.controller.ts`
- `AssistantsService` criado em `apps/api/src/assistants/assistants.service.ts`
- `GET /assistants` criado e protegido com RBAC + tenant
- documentação de auth atualizada com `assistants:read`
- documentação de database atualizada com a entidade `assistants`
- backlog documentado com implementação parcial do domínio de assistants

### BE-008 - Normalizar Assistants no Prisma + Seed + Validação Runtime

- Prioridade: P0
- Objetivo: garantir o delegate normal do Prisma para `Assistant`, adicionar seed demo idempotente e estabilizar a leitura em runtime.
- Arquivos prováveis: `apps/api/src/assistants/assistants.service.ts`, `apps/api/prisma/seed.ts`, `docs/DATABASE.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - trocar acesso raw pelo delegate normal do Prisma
  - criar assistente demo idempotente no seed
  - validar que `assistants:read` continua disponível
  - revisar documentação de banco e status da issue
- Critérios de aceite:
  - `GET /assistants` usa Prisma Client normal
  - seed cria um assistente demo sem duplicar registros
  - a rota continua funcionando com isolamento por tenant
- Testes esperados: `prisma generate`, build, typecheck, lint e validação manual da listagem.
- Observações de segurança: nenhum prompt, token ou secret deve entrar no seed.

Implementação realizada nesta etapa:

- `AssistantsService` passou a usar `prisma.assistant.findMany`
- seed ganhou `assistant_demo_cubo_ai_studio` idempotente
- `docs/DATABASE.md` foi ajustado para refletir o uso real da entidade
- `docs/BACKEND_ISSUES.md` registra a estabilização da base de Assistants IA

### BE-009 - Criar `POST /assistants` com Tenant + RBAC + validação segura

- Prioridade: P0
- Objetivo: permitir a criação segura de assistants no tenant atual com validação de payload.
- Arquivos prováveis: `apps/api/src/assistants/dto/create-assistant.dto.ts`, `apps/api/src/assistants/assistants.controller.ts`, `apps/api/src/assistants/assistants.service.ts`, `docs/AUTH.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar DTO validado para nome e descrição
  - criar `POST /assistants`
  - usar `assistants:write`
  - garantir criação somente no tenant atual
- Critérios de aceite:
  - payload inválido retorna `400`
  - rota exige `assistants:write`
  - criação retorna apenas dados seguros
- Testes esperados: chamadas `curl` de `401`, `403`, `400` e `201`.
- Observações de segurança: não aceitar `companyId` do body e nunca expor secrets.

Implementação realizada nesta etapa:

- `CreateAssistantDto` criado com validação e trim seguro
- `POST /assistants` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:write")`, `@CurrentUser()` e `@Tenant()`
- `AssistantsService` passou a criar assistants via Prisma Client normal
- `docs/AUTH.md` passou a documentar `assistants:write`

### BE-010 - Editar assistente com `PATCH /assistants/:id`

- Prioridade: P0
- Objetivo: permitir edição básica de assistants no tenant atual sem expor outros tenants.
- Arquivos prováveis: `apps/api/src/assistants/dto/update-assistant.dto.ts`, `apps/api/src/assistants/assistants.controller.ts`, `apps/api/src/assistants/assistants.service.ts`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar DTO validado para `name` e `description`
  - criar `PATCH /assistants/:id`
  - validar tenant antes de atualizar
  - retornar `404` quando o assistant não existir no tenant atual
- Critérios de aceite:
  - edição válida retorna `200`
  - payload vazio ou inválido retorna `400`
  - recurso fora do tenant retorna `404`
- Testes esperados: chamadas `curl` de `401`, `403`, `400`, `404` e `200`.
- Observações de segurança: não aceitar campos sensíveis nem alterar `companyId`, `id` ou status.

Implementação realizada nesta etapa:

- `UpdateAssistantDto` criado com validação e trim seguro
- `PATCH /assistants/:id` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:write")`, `@CurrentUser()` e `@Tenant()`
- `AssistantsService` passou a validar tenant com `findFirst` e retornar `404` quando necessário
- edição ficou restrita a `name` e `description`

### BE-011 - Buscar assistente por ID com Tenant + RBAC

- Prioridade: P0
- Objetivo: permitir consulta segura de um assistant específico do tenant atual.
- Arquivos prováveis: `apps/api/src/assistants/assistants.controller.ts`, `apps/api/src/assistants/assistants.service.ts`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar `GET /assistants/:id`
  - usar `assistants:read`
  - validar tenant antes de retornar o recurso
  - retornar `404` para recurso ausente ou fora do tenant
- Critérios de aceite:
  - consulta válida retorna `200`
  - `401`, `403` e `404` se comportam corretamente
  - retorno não expõe dados sensíveis
- Testes esperados: chamadas `curl` de `401`, `403`, `404` e `200`.
- Observações de segurança: nunca vazar existência de assistant fora do tenant.

Implementação realizada nesta etapa:

- `GET /assistants/:id` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:read")`, `@CurrentUser()` e `@Tenant()`
- `AssistantsService` passou a consultar um assistant específico com isolamento por tenant e retornar `404` quando necessário

### BE-012 - Alterar status do Assistant com Tenant + RBAC

- Prioridade: P0
- Objetivo: permitir ativação/desativação segura de assistants do tenant atual sem misturar status com edição geral.
- Arquivos prováveis: `apps/api/src/assistants/dto/update-assistant-status.dto.ts`, `apps/api/src/assistants/assistants.controller.ts`, `apps/api/src/assistants/assistants.service.ts`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar `PATCH /assistants/:id/status`
  - validar enum de status
  - usar `assistants:write`
  - validar tenant antes de atualizar
- Critérios de aceite:
  - status válido retorna `200`
  - payload inválido retorna `400`
  - assistente ausente ou fora do tenant retorna `404`
- Testes esperados: chamadas `curl` de `401`, `403`, `400`, `404` e `200`.
- Observações de segurança: não aceitar campos fora do status nem revelar dados de outro tenant.

Implementação realizada nesta etapa:

- `UpdateAssistantStatusDto` criado com validação de enum
- `PATCH /assistants/:id/status` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:write")`, `@CurrentUser()` e `@Tenant()`
- `AssistantsService` passou a atualizar apenas o status com isolamento por tenant

### BE-013 - Hardening e padronização do módulo Assistants

- Prioridade: P0
- Objetivo: consolidar segurança, manutenção e consistência das rotas de assistants sem criar features novas.
- Arquivos prováveis: `apps/api/src/assistants/assistants.controller.ts`, `apps/api/src/assistants/assistants.service.ts`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - centralizar select seguro
  - revisar ordem das rotas
  - padronizar DTOs e Swagger
  - confirmar permissões e isolamento por tenant
- Critérios de aceite:
  - nenhuma rota existente quebrada
  - leitura e escrita continuam isoladas por tenant
  - respostas seguem o mesmo contrato seguro
- Testes esperados: `prisma generate`, build, typecheck, lint e smoke test das rotas já existentes.
- Observações de segurança: nenhum campo sensível pode voltar ao payload.

Implementação realizada nesta etapa:

- `assistantSafeSelect` centralizado no `AssistantsService`
- ordem dos handlers no controller reorganizada para deixar a rota `/status` explícita antes da rota dinâmica de edição
- documentação de backlog atualizada com o hardening do módulo Assistants

### BE-014 - Base de Conhecimento inicial do Assistant

- Prioridade: P0
- Objetivo: permitir cadastro e listagem de conteúdo manual vinculado a um assistant do tenant atual.
- Arquivos prováveis: `apps/api/src/assistant-knowledge/*`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/004_assistant_knowledge_initial/migration.sql`, `docs/DATABASE.md`, `docs/AUTH.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar modelo mínimo de knowledge manual
  - criar rotas aninhadas por assistant
  - validar assistant contra o tenant atual
  - usar Prisma Client normal e select seguro
- Critérios de aceite:
  - listagem retorna apenas itens do assistant e tenant atuais
  - criação válida retorna `201`
  - recurso inexistente ou fora do tenant retorna `404`
- Testes esperados: chamadas `curl` de `401`, `403`, `404`, `400`, `200` e `201`.
- Observações de segurança: não aceitar assistantId/companyId no body e não expor campos internos.

Implementação realizada nesta etapa:

- `AssistantKnowledge` criado no Prisma com isolamento por tenant
- migration inicial criada para `assistant_knowledge`
- `AssistantKnowledgeModule` criado em `apps/api/src/assistant-knowledge`
- `GET /assistants/:assistantId/knowledge` criado e protegido com `assistants:read`
- `POST /assistants/:assistantId/knowledge` criado e protegido com `assistants:write`
- `docs/DATABASE.md` e `docs/AUTH.md` atualizados com o novo subdomínio

### BE-015 - Editar e remover itens manuais da Knowledge Base

- Prioridade: P0
- Objetivo: completar o CRUD manual de knowledge com edição e remoção seguras por tenant.
- Arquivos prováveis: `apps/api/src/assistant-knowledge/*`, `docs/DATABASE.md`, `docs/AUTH.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar DTO de update para title e content
  - criar `PATCH /assistants/:assistantId/knowledge/:knowledgeId`
  - criar `DELETE /assistants/:assistantId/knowledge/:knowledgeId`
  - validar assistant e knowledge contra tenant atual
  - remover logicamente itens usando `status: INACTIVE`
- Critérios de aceite:
  - edição válida retorna `200`
  - remoção válida retorna `200`
  - recursos ausentes ou fora do tenant retornam `404`
  - payload inválido retorna `400`
- Testes esperados: chamadas `curl` de `401`, `403`, `404`, `400`, `200` e listagem após remoção.
- Observações de segurança: não aceitar ids pelo body e não expor dados de outro tenant.

Implementação realizada nesta etapa:

- `UpdateAssistantKnowledgeDto` criado com validação segura de `title` e `content`
- `PATCH /assistants/:assistantId/knowledge/:knowledgeId` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:write")`, `@CurrentUser()` e `@Tenant()`
- `DELETE /assistants/:assistantId/knowledge/:knowledgeId` criado com o mesmo padrão de proteção
- remoção lógica passou a ocorrer por `status: INACTIVE`
- listagem de knowledge passou a considerar apenas itens ativos

### BE-016 - Preview/teste simples do Assistant usando Knowledge Base manual

- Prioridade: P0
- Objetivo: simular uma resposta determinística do assistant usando os itens ativos da knowledge base manual.
- Arquivos prováveis: `apps/api/src/assistants/*`, `docs/AI_CONTEXT.md`, `docs/AUTH.md`, `docs/DATABASE.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar DTO de preview com pergunta
  - criar `POST /assistants/:assistantId/preview`
  - buscar knowledge ativa do assistant
  - montar resposta determinística sem IA externa
- Critérios de aceite:
  - preview válido retorna `200`
  - assistant inexistente retorna `404`
  - assistant inativo retorna erro controlado
  - pergunta vazia retorna `400`
- Testes esperados: chamadas `curl` de `401`, `403`, `400`, `404`, `200` com knowledge e `200` sem knowledge.
- Observações de segurança: não chamar provedores externos e não expor conteúdo sensível.

Implementação realizada nesta etapa:

- `PreviewAssistantDto` criado com validação segura de `question`
- `POST /assistants/:id/preview` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:read")`, `@CurrentUser()` e `@Tenant()`
- `AssistantsService` passou a montar resposta determinística usando knowledge ativa
- `docs/AI_CONTEXT.md` passou a registrar que o preview ainda não é IA real

### BE-017 - Logs de preview do Assistant

- Prioridade: P0
- Objetivo: persistir e listar logs das execucoes validas de preview do assistant.
- Arquivos prováveis: `apps/api/src/assistants/*`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/005_assistant_preview_logs_initial/migration.sql`, `docs/DATABASE.md`, `docs/AUTH.md`, `docs/AI_CONTEXT.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar modelo de log de preview
  - persistir cada preview valido
  - criar `GET /assistants/:assistantId/preview-logs`
  - limitar a listagem para uso seguro
- Critérios de aceite:
  - preview valido gera log
  - preview negado ou invalido nao gera log
  - listagem retorna apenas logs do assistant e tenant atuais
- Testes esperados: chamadas `curl` de `401`, `403`, `404`, preview valido e listagem.
- Observações de segurança: não salvar headers sensíveis ou conteúdo completo desnecessário.

Implementação realizada nesta etapa:

- `AssistantPreviewLog` criado no Prisma com isolamento por tenant
- migration inicial criada para `assistant_preview_logs`
- `POST /assistants/:id/preview` passou a persistir um log seguro e retornar `previewLogId`
- `GET /assistants/:assistantId/preview-logs` criado e protegido com `assistants:read`
- `docs/DATABASE.md`, `docs/AUTH.md` e `docs/AI_CONTEXT.md` atualizados com o novo comportamento

### BE-006 - Conectar banco com client seguro

- Prioridade: P0
- Objetivo: criar conexão confiável com Postgres/Supabase ou equivalente.
- Arquivos prováveis: `backend/src/db/client.ts`, `backend/src/db/index.ts`.
- Tarefas:
  - criar client do banco
  - encapsular conexão
  - tratar erro de conexão
- Critérios de aceite:
  - conexão inicial funciona
  - falha é tratada com mensagem clara
- Testes esperados: teste de conexão ou smoke test.
- Observações de segurança: credenciais somente no backend.

### BE-006 - Criar tabela companies

- Prioridade: P0
- Objetivo: armazenar empresas/tenants como raiz do isolamento.
- Arquivos prováveis: futura migration de schema e repositório de companies.
- Tarefas:
  - criar tabela `companies`
  - incluir slug único e status
  - documentar índices
- Critérios de aceite:
  - company pode ser criada e consultada
  - slug é único
- Testes esperados: teste de insert/select básico.
- Observações de segurança: toda query deve considerar `company_id`.

### BE-007 - Criar tabela users

- Prioridade: P0
- Objetivo: armazenar usuários associados a uma empresa.
- Arquivos prováveis: futura migration de schema e repositório de users.
- Tarefas:
  - criar tabela `users`
  - vincular com `company_id`
  - manter status e hash de senha
- Critérios de aceite:
  - user pertence a uma company
  - email único por regra definida
- Testes esperados: teste de persistência e vínculo com company.
- Observações de segurança: senha nunca deve sair do backend.

### BE-008 - Criar roles, permissions e junções

- Prioridade: P0
- Objetivo: preparar RBAC mínimo para a plataforma.
- Arquivos prováveis: futuras migrations e helpers de autorização.
- Tarefas:
  - criar `roles`
  - criar `permissions`
  - criar `role_permissions`
- Critérios de aceite:
  - role recebe permissões
  - permissões podem ser consultadas por role
- Testes esperados: teste de associação role-permission.
- Observações de segurança: permissões devem ser verificadas no backend.

### BE-009 - Implementar isolamento por tenant

- Prioridade: P0
- Objetivo: impedir acesso cruzado entre empresas.
- Arquivos prováveis: `backend/src/middleware/tenant.ts`, helpers de query.
- Tarefas:
  - extrair company do contexto autenticado
  - filtrar queries por company
  - bloquear acesso a registros de outra empresa
- Critérios de aceite:
  - usuário não acessa dados fora da company
  - falha retorna erro apropriado
- Testes esperados: teste negativo de isolamento.
- Observações de segurança: este item é bloqueador para qualquer CRUD.

## Epic 3. Autenticação e permissões

### BE-010 - Definir contrato de autenticação

- Prioridade: P0
- Objetivo: fechar o formato de login, sessão e logout.
- Arquivos prováveis: `backend/src/auth/*`, documentação de API.
- Tarefas:
  - definir sessão própria ou herdada
  - padronizar payload de login
  - documentar expiração e refresh
- Critérios de aceite:
  - contrato de auth documentado
  - fluxo de sessão minimamente claro
- Testes esperados: validação contratual do payload.
- Observações de segurança: autenticação real deve viver no backend.

### BE-011 - Criar endpoint de usuário atual

- Prioridade: P0
- Objetivo: permitir que o frontend saiba quem está autenticado.
- Arquivos prováveis: `backend/src/routes/me.ts`.
- Tarefas:
  - criar `GET /api/me`
  - retornar user, company e roles
  - ocultar secrets e hashes
- Critérios de aceite:
  - frontend recebe contexto do usuário
  - dados sensíveis não aparecem
- Testes esperados: teste de resposta do endpoint.
- Observações de segurança: nunca retornar password_hash.

### BE-012 - Implementar middleware de autorização

- Prioridade: P0
- Objetivo: aplicar RBAC em rotas protegidas.
- Arquivos prováveis: `backend/src/middleware/auth.ts`, `backend/src/middleware/rbac.ts`.
- Tarefas:
  - validar sessão
  - checar permissões
  - padronizar erros 401/403
- Critérios de aceite:
  - acesso sem permissão é bloqueado
  - erro é consistente
- Testes esperados: testes de 401 e 403.
- Observações de segurança: nenhuma rota administrativa deve ficar aberta.

### BE-013 - Padronizar hashing e política de credenciais

- Prioridade: P1
- Objetivo: garantir que credenciais sejam tratadas de forma consistente.
- Arquivos prováveis: `backend/src/auth/password.ts`, documentação de segurança.
- Tarefas:
  - definir algoritmo de hash
  - documentar política de senha
  - registrar regras de reset futuro
- Critérios de aceite:
  - hash ocorre no backend
  - política está documentada
- Testes esperados: teste de hash/compare.
- Observações de segurança: nada de senha em localStorage ou logs.

## Epic 4. CRUD de Assistentes IA

### BE-014 - Criar listagem e criação de assistentes

- Prioridade: P0
- Objetivo: disponibilizar o primeiro CRUD funcional de assistentes.
- Arquivos prováveis: `backend/src/routes/assistants.ts`, `backend/src/services/assistants.ts`.
- Tarefas:
  - criar `GET /api/assistants`
  - criar `POST /api/assistants`
  - validar campos obrigatórios
- Critérios de aceite:
  - assistente pode ser criado e listado
  - dados pertencem à company
- Testes esperados: teste de create/list.
- Observações de segurança: validação de tenant obrigatória.

### BE-015 - Criar leitura, atualização e remoção de assistentes

- Prioridade: P0
- Objetivo: completar o CRUD básico.
- Arquivos prováveis: `backend/src/routes/assistants.ts`.
- Tarefas:
  - criar `GET /api/assistants/:id`
  - criar `PUT /api/assistants/:id`
  - criar `DELETE /api/assistants/:id`
- Critérios de aceite:
  - editar e remover funciona
  - não acessa registros de outra company
- Testes esperados: teste de update/delete.
- Observações de segurança: soft delete pode ser preferível.

### BE-016 - Validar prompt, modelo e limites do assistente

- Prioridade: P1
- Objetivo: evitar config inválida no assistente.
- Arquivos prováveis: validators e DTOs de assistants.
- Tarefas:
  - validar prompt e instruções
  - validar `temperature` e `max_tokens`
  - definir defaults seguros
- Critérios de aceite:
  - payload inválido é rejeitado
  - defaults são aplicados
- Testes esperados: teste de validação de DTO.
- Observações de segurança: prompt não pode carregar secrets.

### BE-017 - Criar endpoint de teste do assistente

- Prioridade: P1
- Objetivo: testar a execução sem integrar ainda com tudo.
- Arquivos prováveis: `backend/src/routes/assistant-tests.ts`.
- Tarefas:
  - criar endpoint de teste
  - devolver resposta simulada ou do runtime mínimo
  - registrar tentativa
- Critérios de aceite:
  - teste responde de forma previsível
  - frontend consegue exibir resultado
- Testes esperados: teste de endpoint.
- Observações de segurança: teste sem exposição de segredo.

## Epic 5. Knowledge simples

### BE-018 - Runtime inicial do Assistant

- Prioridade: P0
- Objetivo: criar a primeira rota oficial de execução determinística do assistant usando knowledge manual ativa.
- Arquivos prováveis: `apps/api/src/assistants/dto/run-assistant.dto.ts`, `apps/api/src/assistants/assistants.controller.ts`, `apps/api/src/assistants/assistants.service.ts`, `docs/AI_CONTEXT.md`, `docs/AUTH.md`, `docs/DATABASE.md`.
- Tarefas:
  - criar `POST /assistants/:id/run`
  - reutilizar a mesma base determinística do preview
  - persistir a execução em `assistant_preview_logs` com `mode: deterministic-runtime`
  - manter a listagem de logs compartilhada por preview e runtime
- Critérios de aceite:
  - runtime válido retorna `200`
  - assistant inativo retorna erro controlado
  - execução válida gera log
  - execução inválida nao gera log
- Testes esperados: chamadas `curl` de `401`, `403`, `400`, `404`, `200` e validação de logs.
- Observações de segurança: não chamar IA real, não chamar APIs externas e não expor conteúdo sensível.

Implementação realizada nesta etapa:

- `POST /assistants/:id/run` passou a reutilizar a execução determinística do preview
- as execuções válidas de runtime agora são persistidas em `assistant_preview_logs`
- o campo `mode` diferencia `deterministic-preview` de `deterministic-runtime`
- `GET /assistants/:assistantId/preview-logs` continua funcionando como histórico compartilhado das execuções determinísticas

### BE-019 - Smoke test local ponta a ponta do backend

- Prioridade: P0
- Objetivo: validar localmente o fluxo principal do backend com banco real, seed, auth dev, tenant, RBAC, assistants, knowledge, preview, runtime e logs.
- Arquivos prováveis: `scripts/smoke-backend.mjs`, `docs/SMOKE_TEST_BACKEND.md`, `package.json`, `docs/BACKEND_ISSUES.md`, `docs/DATABASE.md`.
- Tarefas:
  - criar script de smoke test local
  - documentar pré-requisitos e comandos
  - validar principais rotas e erros esperados
  - registrar limitações quando `DATABASE_URL` nao estiver disponível
- Critérios de aceite:
  - existe documentação clara do smoke test
  - o script falha quando um status esperado não acontece
  - o fluxo principal do backend é validado ponta a ponta quando a API e o banco estão disponíveis
- Testes esperados: `401`, `403`, `400`, `404`, `200` e `201` nas rotas principais.
- Observações de segurança: não expor secrets, não chamar APIs externas e não alterar contratos do backend.

Implementação realizada nesta etapa:

- `scripts/smoke-backend.mjs` criado para validar o fluxo local ponta a ponta
- `smoke:backend` adicionado no `package.json`
- `docs/SMOKE_TEST_BACKEND.md` criado com o passo a passo e comandos de validação
- `docs/DATABASE.md` recebeu referência ao guia de smoke test local

### BE-020 - Implementar vínculo entre assistente e base de conhecimento

- Prioridade: P0
- Objetivo: permitir que assistentes usem bases vinculadas.
- Arquivos prováveis: `backend/src/routes/assistant-knowledge-bases.ts`.
- Tarefas:
  - criar vínculo
  - editar prioridade e enabled
  - bloquear vínculos cruzados entre empresas
- Critérios de aceite:
  - assistente consulta bases vinculadas
  - vínculo duplicado é impedido
- Testes esperados: teste de associação.
- Observações de segurança: respeitar tenant isolation.

### BE-021 - Criar reindexação simples

- Prioridade: P1
- Objetivo: deixar pronto o ponto de reprocessamento de conhecimento.
- Arquivos prováveis: serviço de reindex e fila futura.
- Tarefas:
  - criar endpoint de reindex
  - marcar estado de processamento
  - deixar integração pronta para RAG futuro
- Critérios de aceite:
  - reindex pode ser disparado
  - status muda corretamente
- Testes esperados: teste de reindex.
- Observações de segurança: não expor conteúdo sensível em erro.

## Epic 6. Tools/Webhooks

### BE-022 - Criar CRUD de tools

- Prioridade: P0
- Objetivo: permitir cadastrar webhooks HTTP simples.
- Arquivos prováveis: `backend/src/routes/tools.ts`.
- Tarefas:
  - criar listagem, criação, edição e remoção
  - validar método e URL
  - registrar auth_type e secret_ref
- Critérios de aceite:
  - tool pode ser gerenciada pelo backend
  - secrets não são retornados
- Testes esperados: teste de CRUD.
- Observações de segurança: URL e headers devem ser validados.

### BE-023 - Conversas e mensagens iniciais do runtime

- Prioridade: P0
- Objetivo: criar a estrutura inicial de conversas vinculadas a um Assistant e persistir mensagens de usuário e assistente no runtime determinístico atual.
- Arquivos prováveis: `apps/api/src/conversations/*`, `apps/api/prisma/schema.prisma`, `docs/DATABASE.md`, `docs/AUTH.md`, `docs/AI_CONTEXT.md`, `docs/BACKEND_ISSUES.md`.
- Tarefas:
  - criar conversa vinculada ao assistant e ao tenant atual
  - listar conversas de um assistant
  - consultar mensagens de uma conversa
  - enviar mensagem para a conversa usando o runtime determinístico atual
  - manter o tenant via `@Tenant()` e o usuário via `@CurrentUser()`
- Critérios de aceite:
  - conversa pode ser criada e listada
  - mensagens de usuário e assistente ficam persistidas
  - leitura e escrita respeitam tenant e RBAC
  - o runtime continua determinístico, sem IA real e sem APIs externas
- Testes esperados: chamadas `curl` de `401`, `403`, `400`, `404`, `200` e `201` para o fluxo de conversas.
- Observações de segurança: não aceitar companyId, tenantId, assistantId, conversationId ou userId pelo body e não expor conteúdo sensível.

Implementação realizada nesta etapa:

- `AssistantConversation` e `AssistantConversationMessage` adicionados ao Prisma com isolamento por tenant
- migration inicial criada para `assistant_conversations` e `assistant_conversation_messages`
- `AssistantConversationsModule` criado em `apps/api/src/assistant-conversations`
- `POST /assistants/:assistantId/conversations` criado e protegido com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("assistants:write")`, `@CurrentUser()` e `@Tenant()`
- `GET /assistants/:assistantId/conversations` criado com `assistants:read`
- `GET /assistants/:assistantId/conversations/:conversationId/messages` criado com `assistants:read`
- `POST /assistants/:assistantId/conversations/:conversationId/messages` criado com `assistants:write`
- runtime determinístico compartilhado com preview/run reaproveitado para gerar a resposta do assistente
- documentação atualizada para refletir a sequência BE-022 Tools e BE-023 Conversas/mensagens

### BE-024 - Criar teste de execução de tool com cliente HTTP seguro

- Prioridade: P0
- Objetivo: executar tool sem acesso direto do frontend a terceiros.
- Arquivos prováveis: `backend/src/services/tool-runner.ts`.
- Tarefas:
  - criar client HTTP interno
  - aplicar timeout
  - capturar resposta e erro
- Critérios de aceite:
  - tool test executa via backend
  - timeout funciona
- Testes esperados: teste de execução com mock HTTP.
- Observações de segurança: nenhum segredo pode ir para o navegador.

### BE-025 - Criar redaction e storage de referência de secrets

- Prioridade: P1
- Objetivo: garantir que tools usem segredos apenas por referência.
- Arquivos prováveis: `backend/src/security/secrets.ts`.
- Tarefas:
  - salvar apenas referência
  - mascarar valor em respostas
  - redigir logs
- Critérios de aceite:
  - secret nunca retorna em claro
  - logs não mostram token
- Testes esperados: teste de redaction.
- Observações de segurança: este item é crítico para produção.

## Epic 7. Integração Cubo.Chat/Chatwoot

### BE-026 - Criar receptor de webhook de mensagem

- Prioridade: P0
- Objetivo: receber eventos de conversa vindos do Cubo.Chat/Chatwoot.
- Arquivos prováveis: `backend/src/webhooks/cubo-chat.ts`.
- Tarefas:
  - criar endpoint de webhook
  - validar assinatura
  - registrar evento bruto de forma segura
- Critérios de aceite:
  - evento chega ao backend
  - assinatura é validada
- Testes esperados: teste de webhook assinado.
- Observações de segurança: rejeitar payload inválido ou não autenticado.

### BE-027 - Criar resolução de canal, inbox e conversa

- Prioridade: P0
- Objetivo: mapear evento externo para company, channel e conversation.
- Arquivos prováveis: `backend/src/services/channel-resolver.ts`.
- Tarefas:
  - resolver `external_channel_id`
  - resolver `external_conversation_id`
  - persistir vínculo com company
- Critérios de aceite:
  - evento é associado ao tenant correto
  - conversas são criadas ou atualizadas
- Testes esperados: teste de mapeamento.
- Observações de segurança: nunca confiar cegamente em IDs externos.

### BE-028 - Criar envio de resposta para Cubo.Chat/Chatwoot

- Prioridade: P0
- Objetivo: permitir resposta automática pelo backend.
- Arquivos prováveis: `backend/src/services/channel-sender.ts`.
- Tarefas:
  - criar client de envio
  - formatar payload de saída
  - registrar status de envio
- Critérios de aceite:
  - resposta é enviada pelo backend
  - falhas são capturadas
- Testes esperados: teste com mock de envio.
- Observações de segurança: não expor credenciais do canal.

### BE-029 - Criar pausa e retorno da IA por takeover humano

- Prioridade: P0
- Objetivo: suspender IA quando humano assumir a conversa.
- Arquivos prováveis: `backend/src/services/handover.ts`.
- Tarefas:
  - marcar `paused_by_human`
  - suspender automação
  - permitir retomada segura
- Critérios de aceite:
  - takeover desativa resposta automática
  - release reativa IA quando permitido
- Testes esperados: teste de pausa e retomada.
- Observações de segurança: takeover precisa ser idempotente.

## Epic 8. Runtime IA MVP

### BE-030 - Criar orquestrador mínimo do runtime

- Prioridade: P0
- Objetivo: centralizar o fluxo de execução da IA.
- Arquivos prováveis: `backend/src/runtime/orchestrator.ts`.
- Tarefas:
  - criar pipeline básico
  - receber contexto de conversa
  - preparar chamada ao modelo
- Critérios de aceite:
  - fluxo central existe
  - runtime é chamável a partir do webhook
- Testes esperados: teste unitário do orquestrador.
- Observações de segurança: nunca executar fora do backend.

### BE-031 - Carregar contexto, memória e histórico da conversa

- Prioridade: P0
- Objetivo: alimentar o runtime com contexto mínimo útil.
- Arquivos prováveis: serviços de conversations, messages e memories.
- Tarefas:
  - buscar últimas mensagens
  - buscar memória do contato
  - montar contexto base
- Critérios de aceite:
  - runtime recebe contexto consistente
  - histórico e memória não vazam entre tenants
- Testes esperados: teste de agregação de contexto.
- Observações de segurança: limitar conteúdo retornado.

### BE-032 - Criar decisão simples de conhecimento e tools

- Prioridade: P1
- Objetivo: permitir que o runtime decida quando consultar base ou tool.
- Arquivos prováveis: `backend/src/runtime/decision.ts`.
- Tarefas:
  - criar decisão determinística simples
  - consultar knowledge quando habilitado
  - chamar tool apenas quando necessário
- Critérios de aceite:
  - decisão é previsível no MVP
  - tool não roda sem autorização
- Testes esperados: teste de decisão.
- Observações de segurança: evitar execução acidental de tool.

### BE-033 - Validar resposta antes de enviar

- Prioridade: P0
- Objetivo: impedir que a IA envie conteúdo inválido.
- Arquivos prováveis: `backend/src/runtime/response-validator.ts`.
- Tarefas:
  - validar tamanho e formato
  - aplicar fallback
  - bloquear vazamento de segredo
- Critérios de aceite:
  - resposta inválida não é enviada
  - fallback humano é acionável
- Testes esperados: teste de validação.
- Observações de segurança: redaction obrigatório.

### BE-034 - Conectar o endpoint de teste ao runtime

- Prioridade: P1
- Objetivo: fazer o teste do assistente usar o mesmo fluxo central.
- Arquivos prováveis: endpoint de teste e runtime.
- Tarefas:
  - reutilizar orquestrador
  - registrar resultado do teste
  - retornar resposta padronizada
- Critérios de aceite:
  - teste usa runtime real do MVP
  - resultado é previsível
- Testes esperados: teste de integração do endpoint.
- Observações de segurança: o teste não pode expor internals.

## Epic 9. Logs e observabilidade

### BE-035 - Criar escrita de execution_logs

- Prioridade: P0
- Objetivo: registrar auditoria principal do runtime.
- Arquivos prováveis: `backend/src/logging/execution-logs.ts`.
- Tarefas:
  - gravar execução
  - registrar modelo, tokens e latência
  - associar assistant, channel e conversation
- Critérios de aceite:
  - execução gera log
  - log é consultável depois
- Testes esperados: teste de gravação.
- Observações de segurança: redaction obrigatório.

### BE-036 - Criar listagem e timeline de logs

- Prioridade: P1
- Objetivo: permitir inspeção operacional.
- Arquivos prováveis: `backend/src/routes/logs.ts`.
- Tarefas:
  - criar listagem filtrável
  - criar timeline por execução
  - suportar paginação
- Critérios de aceite:
  - logs podem ser consultados
  - timeline mostra eventos relevantes
- Testes esperados: teste de listagem e timeline.
- Observações de segurança: filtrar PII e secrets.

### BE-037 - Criar export e redaction consistente

- Prioridade: P1
- Objetivo: permitir suporte e auditoria sem vazar segredo.
- Arquivos prováveis: serviço de export e redaction.
- Tarefas:
  - exportar logs em formato seguro
  - redigir tokens, headers e payloads sensíveis
  - documentar política de retenção
- Critérios de aceite:
  - export não vazia dados sensíveis
  - redaction é consistente
- Testes esperados: teste de redaction e export.
- Observações de segurança: nunca exportar secret em claro.

## Epic 10. Consumo e custos

### BE-038 - Criar eventos de uso de IA

- Prioridade: P0
- Objetivo: registrar consumo por execução.
- Arquivos prováveis: `backend/src/usage/ai-usage-events.ts`.
- Tarefas:
  - criar escrita de eventos
  - registrar tokens e custo estimado
  - associar conversation e assistant
- Critérios de aceite:
  - consumo é registrado por evento
  - dados são consistentes
- Testes esperados: teste de gravação de evento.
- Observações de segurança: dados agregados, sem secrets.

### BE-039 - Criar resumo de consumo e consultas por recorte

- Prioridade: P1
- Objetivo: permitir visão básica de uso.
- Arquivos prováveis: `backend/src/routes/usage.ts`.
- Tarefas:
  - criar resumo geral
  - criar consultas por assistant, channel e model
  - suportar janela de tempo
- Critérios de aceite:
  - frontend recebe métricas mínimas
  - filtros funcionam
- Testes esperados: teste de API de consumo.
- Observações de segurança: isolamento por company obrigatório.

### BE-040 - Criar cálculo simples de custo e limite

- Prioridade: P1
- Objetivo: prevenir uso excessivo no MVP.
- Arquivos prováveis: `backend/src/cost/cost-engine.ts`.
- Tarefas:
  - calcular custo estimado
  - verificar limite por company
  - bloquear execução quando exceder política
- Critérios de aceite:
  - custo é estimado
  - limite pode bloquear runtime
- Testes esperados: teste de cálculo e bloqueio.
- Observações de segurança: nunca depender de cálculo no frontend.

## Epic 11. Testes e hardening

### BE-041 - Criar testes de contrato para os endpoints centrais

- Prioridade: P0
- Objetivo: garantir que os contratos não quebrem o frontend.
- Arquivos prováveis: suíte de testes de API.
- Tarefas:
  - validar contracts de assistants, knowledge, tools e channels
  - cobrir respostas principais
  - fixar payloads mínimos
- Critérios de aceite:
  - contratos centrais estão cobertos
  - regressões ficam evidentes
- Testes esperados: testes de contrato.
- Observações de segurança: contratos não devem expor secrets.

### BE-042 - Criar teste de integração do fluxo mensagem -> resposta

- Prioridade: P0
- Objetivo: verificar o caminho principal do MVP.
- Arquivos prováveis: testes de integração do runtime e webhook.
- Tarefas:
  - simular webhook
  - executar runtime
  - validar envio da resposta
- Critérios de aceite:
  - fluxo principal passa do webhook ao envio
  - logs e consumo são gravados
- Testes esperados: integração end-to-end controlada.
- Observações de segurança: usar mocks seguros para integrações externas.

### BE-043 - Criar testes de assinatura de webhook e rate limit

- Prioridade: P1
- Objetivo: fechar pontos mínimos de segurança operacional.
- Arquivos prováveis: middleware de segurança e testes.
- Tarefas:
  - testar assinatura válida e inválida
  - testar rate limit básico
  - testar rejeição de payloads inválidos
- Critérios de aceite:
  - webhook rejeita chamadas indevidas
  - limite de abuso funciona
- Testes esperados: testes de segurança.
- Observações de segurança: proteção contra abuso é obrigatória.

### BE-044 - Criar base de observabilidade e tracing

- Prioridade: P1
- Objetivo: facilitar troubleshooting no go-live.
- Arquivos prováveis: logger, tracing e configuração operacional.
- Tarefas:
  - padronizar correlation id
  - criar logs estruturados
  - preparar tracing futuro
- Critérios de aceite:
  - requisições podem ser rastreadas
  - erros ficam acionáveis
- Testes esperados: teste de correlação básica.
- Observações de segurança: logs estruturados devem redigir campos sensíveis.

## Epic 12. Integração frontend-backend

### BE-045 - Mapear contratos do frontend para DTOs do backend

- Prioridade: P0
- Objetivo: alinhar payloads da API com o frontend já validado.
- Arquivos prováveis: contratos de API, DTOs e service layer.
- Tarefas:
  - mapear tipos do frontend
  - criar DTOs compatíveis
  - documentar divergências
- Critérios de aceite:
  - frontend consome respostas compatíveis
  - tipos ficam coerentes
- Testes esperados: teste de contrato e typecheck.
- Observações de segurança: nunca enviar campos sensíveis para a UI.

### BE-046 - Integrar sessão/autenticação do frontend ao backend

- Prioridade: P0
- Objetivo: remover o mock e usar sessão real do backend.
- Arquivos prováveis: services de auth, guards e clientes do frontend.
- Tarefas:
  - substituir sessão mockada
  - validar `/api/me`
  - remover dependência de dados sensíveis no cliente
- Critérios de aceite:
  - frontend usa auth do backend
  - nenhum secret é armazenado no browser
- Testes esperados: smoke test de login e sessão.
- Observações de segurança: este item é crítico.

### BE-047 - Conectar services do frontend às rotas reais

- Prioridade: P1
- Objetivo: trocar mocks por chamadas de API do backend.
- Arquivos prováveis: `src/services/*` no frontend e cliente HTTP.
- Tarefas:
  - apontar services para `/api/*`
  - padronizar erro, loading e retorno
  - remover chamadas diretas externas
- Critérios de aceite:
  - services consomem backend real
  - fluxo do frontend não quebra
- Testes esperados: typecheck e build do frontend.
- Observações de segurança: nenhuma integração externa no browser.

### BE-048 - Desativar fallback mock quando backend estiver disponível

- Prioridade: P2
- Objetivo: evitar ambiguidade entre mock e backend em produção.
- Arquivos prováveis: feature flags, docs e services.
- Tarefas:
  - definir modo dev e modo produção
  - eliminar fallback inseguro em produção
  - documentar comportamento
- Critérios de aceite:
  - produção usa backend
  - mock fica restrito ao desenvolvimento
- Testes esperados: validação de ambiente.
- Observações de segurança: fallback não pode carregar segredo.

## Ordem recomendada de execução

Ordem exata recomendada para chegar ao MVP:

1. BE-001 - Definir stack backend
2. BE-002 - Criar estrutura inicial do backend
3. BE-003 - Criar healthcheck e endpoint raiz
4. BE-004 - Configurar variáveis de ambiente seguras
5. BE-005 - Conectar banco com client seguro
6. BE-006 - Criar tabela companies
7. BE-007 - Criar tabela users
8. BE-008 - Criar roles, permissions e junções
9. BE-009 - Implementar isolamento por tenant
10. BE-010 - Definir contrato de autenticação
11. BE-011 - Criar endpoint de usuário atual
12. BE-012 - Implementar middleware de autorização
13. BE-013 - Padronizar hashing e política de credenciais
14. BE-014 - Criar listagem e criação de assistentes
15. BE-015 - Criar leitura, atualização e remoção de assistentes
16. BE-016 - Validar prompt, modelo e limites do assistente
17. BE-017 - Criar endpoint de teste do assistente
18. BE-018 - Criar CRUD de knowledge bases
19. BE-019 - Criar metadados de documentos de conhecimento
20. BE-020 - Implementar vínculo entre assistente e base de conhecimento
21. BE-021 - Criar reindexação simples
22. BE-022 - Criar CRUD de tools
23. BE-023 - Conversas e mensagens iniciais do runtime
24. BE-024 - Criar teste de execução de tool com cliente HTTP seguro
25. BE-025 - Criar redaction e storage de referência de secrets
26. BE-026 - Criar receptor de webhook de mensagem
27. BE-027 - Criar resolução de canal, inbox e conversa
28. BE-028 - Criar envio de resposta para Cubo.Chat/Chatwoot
29. BE-029 - Criar pausa e retorno da IA por takeover humano
30. BE-030 - Criar orquestrador mínimo do runtime
31. BE-031 - Carregar contexto, memória e histórico da conversa
32. BE-032 - Criar decisão simples de conhecimento e tools
33. BE-033 - Validar resposta antes de enviar
34. BE-034 - Conectar o endpoint de teste ao runtime
35. BE-035 - Criar escrita de execution_logs
36. BE-036 - Criar listagem e timeline de logs
37. BE-037 - Criar export e redaction consistente
38. BE-038 - Criar eventos de uso de IA
39. BE-039 - Criar resumo de consumo e consultas por recorte
40. BE-040 - Criar cálculo simples de custo e limite

As issues BE-040 em diante são recomendadas para hardening e integração fina, mas não bloqueiam o primeiro MVP se o produto já estiver operando com as garantias mínimas acima.

## Não fazer ainda

- Flow Builder real
- RAG avançado
- billing automático
- marketplace
- multi-provider avançado
- edição liberada para cliente final
- integrações externas complexas
- automações recorrentes
- analytics avançado
- canais adicionais além do Cubo.Chat/Chatwoot no MVP
- painel administrativo excessivamente detalhado antes do go-live

## BE-020 - Ambiente local Postgres para smoke test real

Nota de contexto:

- o backlog historico antigo tambem usava o identificador `BE-020` para um tema de produto futuro
- nesta fase, `BE-020` foi usada operacionalmente para consolidar setup local, banco Docker e smoke test real
- o resultado desta `BE-020` operacional foi validado com sucesso

- Prioridade: P0
- Objetivo: permitir subir Postgres e Redis localmente, aplicar migrations, rodar seed e executar o smoke test real com o backend em `http://localhost:3001`.
- Arquivos prováveis: `infra/docker-compose.local.yml`, `.env.example`, `scripts/bootstrap-local.mjs`, `package.json`, `docs/SMOKE_TEST_BACKEND.md`, `docs/BACKEND_SETUP.md`, `docs/DATABASE.md`.
- Tarefas:
  - manter o compose local para Postgres e Redis
  - garantir `DATABASE_URL` local em `.env.example`
  - deixar `setup:local` preparar o ambiente completo
  - adicionar aliases de `db:local:*`
  - documentar o smoke test com API em `3001`
- Critérios de aceite:
  - `npm run setup:local` prepara o ambiente sem sobrescrever `.env`
  - o smoke test consegue apontar para a API local quando ela estiver em execução
  - a documentação explica o fluxo de setup, migrations, seed e execução do smoke
- Testes esperados: `node --check` do smoke, `curl` para health e execução do smoke com banco local.
- Observações de segurança: nunca commitar secrets e nunca enfraquecer Auth/RBAC/Tenant.

### Implementação/ajuste realizado nesta correção

- `scripts/docker-utils.mjs` agora resolve o binário do Docker no PATH ou no Docker Desktop do macOS
- `scripts/docker-up.mjs`, `scripts/docker-down.mjs` e `scripts/docker-logs.mjs` usam o mesmo resolvedor
- `scripts/bootstrap-local.mjs` agora roda `db:seed` e imprime os próximos passos corretos
- `scripts/smoke-backend.mjs` testa `GET /health` antes do fluxo e mostra mensagem amigável se a API não estiver no ar
- `apps/api/package.json` ganhou a configuração oficial de seed do Prisma e passou a usar `node --experimental-strip-types`
- `apps/api/src/app.module.ts` passou a ler `.env` da raiz e do diretório da API
- `package.json` raiz ganhou `api:start`
- a documentação foi alinhada para usar `npm run setup:local`, `npm run api:start` e `npm run smoke:backend`
- a documentação parou de recomendar `npx prisma` genérico e `start:dev` inexistente
- o Postgres local deste projeto passou a expor a porta `5433` para evitar conflito com outras instâncias locais
- fluxo validado com sucesso:

```bash
npm run setup:local
npm run api:start
npm run smoke:backend
```

## AI-007 - Logs e observabilidade de IA

Status: concluida.

Resumo:

- criado `AssistantRuntimeLog` / `assistant_runtime_logs` para metadados seguros de execucao do runtime
- `POST /assistants/:assistantId/conversations/:conversationId/messages` grava log ao final de cada mensagem processada
- criados `GET /logs/ai` e `GET /logs/ai/:id`
- rotas protegidas com `AuthGuard`, `PermissionsGuard`, `@RequirePermissions("logs:read")`, `@CurrentUser()` e `@Tenant()`
- tela `/logs` passou a consumir logs reais do backend
- smoke passou a validar `runtime.logId` e consulta de logs sem depender de provider externo

Campos salvos:

- modo, status, provider, modelo, origem da configuracao
- fallback, reason, outcome e duracao
- erro sanitizado do provider
- contadores de knowledge/historico/contexto
- ids internos de rastreio

Campos explicitamente nao salvos:

- API key
- headers/authorization
- prompt completo
- body bruto do provider
- resposta bruta completa do provider
- stack trace

Fora do escopo:

- tokens/custos/tracing avancado
- dashboards agregados
- tools
- canais externos
- embeddings/RAG vetorial
