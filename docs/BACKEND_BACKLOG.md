# BACKEND BACKLOG - Cubo AI Studio

Documento de priorização técnica para transformar o frontend mockado do Cubo AI Studio em um sistema funcional integrado ao Cubo.Chat/Chatwoot.

Este backlog assume as seguintes restrições:

- não implementar backend agora
- não conectar APIs reais agora
- não alterar o escopo do produto
- não mexer no Flow Builder avançado nesta fase inicial
- manter o frontend atual como contrato de interface

---

## 1. Objetivo do backend

O backend deve ser a fonte única de verdade para:

- integrar Cubo AI Studio ao Cubo.Chat/Chatwoot
- permitir criação e gestão de Assistentes IA
- permitir base de conhecimento
- permitir ferramentas e webhooks
- executar IA com segurança
- registrar logs e auditoria
- controlar consumo e custos
- manter multiempresa com isolamento real

### Princípios

- o navegador nunca chama provedores de IA diretamente
- o navegador nunca recebe secrets em claro
- toda integração externa passa pelo backend
- toda ação sensível deve ser auditável
- toda entidade deve ser isolada por empresa

---

## 2. Escopo do MVP

O MVP precisa apenas do necessário para colocar o primeiro cliente em produção com Cubo.Chat.

### Incluído no MVP

- Assistente IA simples
- Prompt e instruções
- Base de conhecimento simples
- Tool/webhook HTTP
- Canal vinculado ao Cubo.Chat
- Teste do assistente
- Logs de execução
- Consumo básico

### Critério do MVP

O primeiro cliente precisa conseguir:

1. criar um assistente
2. configurar prompt e conhecimento
3. vincular a um inbox do Cubo.Chat
4. responder conversas reais com segurança
5. visualizar logs e consumo básico

### Sequencia de produto para o cerebro da IA

Antes de tocar no runtime real, o produto deve seguir esta ordem conceitual:

1. AI-000 - Plano tecnico do cerebro da IA
2. AI-001 - Provider de IA real
3. AI-002 - Prompt e instrucoes do assistente
4. AI-003 - Runtime real de conversa
5. AI-004 - Configuracao de IA por tenant/empresa
6. AI-005 - Logs e observabilidade de IA
7. AI-006 - Knowledge e RAG simples
8. BE-022 - CRUD de Tools, como issue canonical da fase de tools/functions
9. AI-007 - Canais externos

Esse ordenamento deixa claro que Tools continua importante, mas a base de IA real precisa existir antes de ampliar integracoes.

AI-001 ja foi iniciado na camada backend-only com diagnostico seguro.
AI-002 ja foi concluida com persistencia de instructions, model e temperature no Assistant.
AI-003 ja foi concluida e o runtime de conversa agora tenta IA real com fallback deterministico.
AI-004 agora foca na configuracao de IA por tenant/empresa, com API key cifrada no backend.

---

## 3. Fora do MVP

Esses itens devem ficar para depois:

- Flow Builder avançado
- Marketplace
- Multi-provider avançado
- Billing automático
- Builder liberado para cliente final
- Integrações complexas
- Automações recorrentes
- analytics avançado

### Observação

Esses módulos podem existir como visão de produto, mas não devem travar o primeiro go-live.

---

## 4. Arquitetura proposta

### 4.1 API Backend

Responsável por expor os contratos REST e webhooks internos.

Funções:

- autenticação
- multiempresa
- CRUD
- validações
- rate limit
- roteamento para serviços internos

### 4.2 Auth / Multiempresa

Responsável por:

- login
- logout
- refresh
- sessão
- RBAC
- tenant isolation
- associação usuário-empresa

### 4.3 Assistant Engine

Responsável por:

- criar e atualizar assistentes
- versionar prompt e configuração
- vincular canais
- aplicar políticas do assistente

### 4.3.1 Evolucao do Assistant para IA real

Na fase futura, o Assistant deve guardar o conteudo conceitual da IA real, sem depender de mocks.

Campos conceituais esperados:

- `instructions`
- `model`
- `temperature`

Esses dados ficam no dominio de Assistant e nao em mocks de frontend.

### 4.4 Knowledge Engine

Responsável por:

- cadastro de bases
- ingestão de arquivos e URLs
- chunking
- indexação
- recuperação de contexto

### 4.5 Tool / Webhook Engine

Responsável por:

- CRUD de tools
- execução de webhooks
- timeout
- retries
- autenticação de saída
- sanitização de payload

### 4.6 Channel Engine

Responsável por:

- integrar com Cubo.Chat/Chatwoot
- mapear inbox, canal e assistente
- receber eventos
- enviar respostas
- pausar/reativar IA por canal

### 4.7 Runtime / Execution Engine

Responsável por:

- orquestrar o ciclo de resposta da IA
- carregar contexto
- buscar memória
- buscar conhecimento
- decidir uso de tools
- validar resposta
- publicar mensagem de saída

### 4.7.1 Regras de evolucao do runtime

- o runtime real deve ser chamado apenas pelo backend
- o runtime deterministico deve permanecer como fallback
- o runtime real deve ser compatível com providers configurados por `AI_BASE_URL`
- o runtime nao deve depender de API key no frontend

### 4.8 Logs / Observability Engine

Responsável por:

- registrar eventos de execução
- rastrear mensagens
- rastrear chamadas de tools
- guardar auditoria
- suportar troubleshooting

### 4.8.1 Sinais esperados de observabilidade

- modo usado
- provider usado
- modelo usado
- tempo de resposta
- erro controlado
- tokens, quando existirem
- custo estimado, quando aplicavel

### 4.9 Cost Engine

Responsável por:

- registrar uso de tokens
- estimar custo por modelo
- somar custo por empresa
- somar custo por assistente
- aplicar limites

### 4.10 Security / Secrets Engine

Responsável por:

- armazenar secrets com criptografia
- nunca retornar secrets ao frontend
- rotação
- masking
- assinatura de webhooks
- trilha de auditoria

### 4.10.1 Regras de secrets para IA

- secrets de provider vivem apenas no backend
- frontend nunca recebe API key
- smoke e demo local nao podem depender de API key real
- o provider real deve aceitar configuracao por `.env`

---

## 5. Plano tecnico do cerebro da IA

O plano detalhado esta documentado em `docs/AI_RUNTIME_PLAN.md`.

Resumo da sequencia tecnica:

1. AI-000 - documentar o plano e os limites
2. AI-001 - criar provider de IA real com interface unica
3. AI-002 - levar instructions, model e temperature para o Assistant
4. AI-003 - trocar o envio de mensagem para runtime real com fallback deterministico
5. AI-004 - configurar IA por tenant/empresa
6. AI-005 - registrar logs e observabilidade do runtime
7. AI-006 - evoluir knowledge e RAG simples
8. BE-022 - conectar tools/functions reais
9. AI-007 - integrar canais externos somente depois do runtime estabilizado

---

## 5. Banco de dados

Tabela proposta para a primeira versão.

### 5.1 `companies`

Finalidade:

- representar cada empresa/tenant do sistema

Campos principais:

- `id`
- `name`
- `slug`
- `status`
- `plan`
- `created_at`
- `updated_at`

Relações:

- uma company possui muitos users
- uma company possui muitos assistants
- uma company possui muitos knowledge_bases
- uma company possui muitos tools
- uma company possui muitos channels

Índices importantes:

- `unique(slug)`
- `status`

### 5.2 `users`

Finalidade:

- usuários da plataforma

Campos principais:

- `id`
- `company_id`
- `name`
- `email`
- `password_hash`
- `status`
- `created_at`
- `updated_at`

Relações:

- pertence a uma company
- participa de roles/permissions

Índices importantes:

- `unique(email)`
- `company_id`
- `status`

### 5.3 `roles`

Finalidade:

- definir perfis de acesso

Campos principais:

- `id`
- `company_id`
- `name`
- `description`
- `created_at`

Relações:

- pertence a uma company
- vincula permissões

Índices importantes:

- `unique(company_id, name)`

### 5.4 `permissions`

Finalidade:

- catálogo de permissões do sistema

Campos principais:

- `id`
- `code`
- `description`
- `created_at`

Relações:

- muitas permissões podem ser atribuídas a muitos roles

Índices importantes:

- `unique(code)`

### 5.5 `role_permissions`

Finalidade:

- tabela de junção entre roles e permissions

Campos principais:

- `role_id`
- `permission_id`

Relações:

- role -> permissions

Índices importantes:

- `unique(role_id, permission_id)`

### 5.6 `assistants`

Finalidade:

- armazenar os assistentes IA

Campos principais:

- `id`
- `company_id`
- `name`
- `description`
- `status`
- `model`
- `temperature`
- `max_tokens`
- `system_prompt`
- `default_language`
- `memory_enabled`
- `knowledge_enabled`
- `created_by`
- `created_at`
- `updated_at`

Relações:

- pertence a uma company
- possui knowledge bases vinculadas
- possui channels vinculados
- possui execution logs

Índices importantes:

- `company_id`
- `status`
- `created_by`
- `updated_at`

Implementação parcial realizada:

- modelo mínimo criado para suportar listagem por tenant
- rota inicial `GET /assistants` usa esse modelo

### 5.7 `assistant_knowledge_bases`

Finalidade:

- vincular assistente e base de conhecimento

Campos principais:

- `id`
- `company_id`
- `assistant_id`
- `knowledge_base_id`
- `enabled`
- `priority`
- `created_at`

Relações:

- assistant -> knowledge_bases

Índices importantes:

- `unique(assistant_id, knowledge_base_id)`
- `company_id`

### 5.8 `knowledge_bases`

Finalidade:

- representar uma base de conhecimento

Campos principais:

- `id`
- `company_id`
- `name`
- `type`
- `status`
- `source_count`
- `chunk_count`
- `last_indexed_at`
- `created_by`
- `created_at`
- `updated_at`

Relações:

- possui muitos documents
- pode ser vinculada a vários assistants

Índices importantes:

- `company_id`
- `status`
- `updated_at`

### 5.9 `knowledge_documents`

Finalidade:

- armazenar documentos, URLs ou FAQs ingeridos

Campos principais:

- `id`
- `company_id`
- `knowledge_base_id`
- `source_type`
- `source_url`
- `file_name`
- `mime_type`
- `status`
- `checksum`
- `storage_key`
- `created_at`
- `updated_at`

Relações:

- pertence a uma knowledge_base

Índices importantes:

- `knowledge_base_id`
- `status`
- `checksum`

### 5.10 `tools`

Finalidade:

- armazenar tools e webhooks

Campos principais:

- `id`
- `company_id`
- `name`
- `description`
- `method`
- `url`
- `headers_json`
- `body_template`
- `auth_type`
- `secret_ref`
- `status`
- `created_by`
- `created_at`
- `updated_at`

Relações:

- pertence a uma company
- pode ser vinculada a assistants
- pode gerar tool_executions

Índices importantes:

- `company_id`
- `status`
- `updated_at`

### 5.11 `tool_executions`

Finalidade:

- rastrear cada chamada de tool

Campos principais:

- `id`
- `company_id`
- `assistant_id`
- `tool_id`
- `conversation_id`
- `request_payload`
- `response_payload`
- `status`
- `duration_ms`
- `error_message`
- `created_at`

Relações:

- pertence a um assistant
- pertence a uma tool
- pertence a uma conversation

Índices importantes:

- `company_id`
- `assistant_id`
- `tool_id`
- `conversation_id`
- `created_at`

### 5.12 `channels`

Finalidade:

- representar canais conectados ao Cubo.Chat/Chatwoot

Campos principais:

- `id`
- `company_id`
- `type`
- `provider`
- `external_channel_id`
- `inbox_id`
- `status`
- `paused_by_human`
- `last_seen_at`
- `created_at`
- `updated_at`

Relações:

- pertence a uma company
- pode ser vinculado a assistants

Índices importantes:

- `company_id`
- `inbox_id`
- `external_channel_id`

### 5.13 `assistant_channels`

Finalidade:

- vincular assistentes a canais

Campos principais:

- `id`
- `company_id`
- `assistant_id`
- `channel_id`
- `active`
- `priority`
- `created_at`

Relações:

- assistant -> channel

Índices importantes:

- `unique(assistant_id, channel_id)`
- `company_id`

### 5.14 `conversations`

Finalidade:

- representar conversas sincronizadas com Cubo.Chat/Chatwoot

Campos principais:

- `id`
- `company_id`
- `channel_id`
- `external_conversation_id`
- `contact_id`
- `status`
- `assigned_human`
- `assistant_enabled`
- `last_message_at`
- `created_at`
- `updated_at`

Relações:

- pertence a um channel
- possui messages
- possui execution_logs

Índices importantes:

- `company_id`
- `channel_id`
- `external_conversation_id`
- `status`
- `last_message_at`

### 5.15 `messages`

Finalidade:

- armazenar mensagens recebidas e enviadas

Campos principais:

- `id`
- `company_id`
- `conversation_id`
- `direction`
- `sender_type`
- `content`
- `content_json`
- `external_message_id`
- `created_at`

Relações:

- pertence a uma conversation

Índices importantes:

- `conversation_id`
- `external_message_id`
- `created_at`

### 5.16 `execution_logs`

Finalidade:

- auditoria principal do runtime da IA

Campos principais:

- `id`
- `company_id`
- `assistant_id`
- `channel_id`
- `conversation_id`
- `message_id`
- `status`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `estimated_cost`
- `model`
- `latency_ms`
- `trace_id`
- `created_at`

Relações:

- pertence a assistant, channel, conversation, message

Índices importantes:

- `company_id`
- `assistant_id`
- `channel_id`
- `conversation_id`
- `created_at`
- `trace_id`

### 5.17 `memories`

Finalidade:

- armazenar memória curta ou longa associada a contato/assistente

Campos principais:

- `id`
- `company_id`
- `assistant_id`
- `contact_id`
- `memory_key`
- `memory_value`
- `scope`
- `expires_at`
- `created_at`
- `updated_at`

Relações:

- pertence a uma company
- pertence a um assistant

Índices importantes:

- `company_id`
- `assistant_id`
- `contact_id`
- `memory_key`
- `expires_at`

### 5.18 `ai_usage_events`

Finalidade:

- registrar eventos de consumo de IA

Campos principais:

- `id`
- `company_id`
- `assistant_id`
- `conversation_id`
- `model`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `estimated_cost`
- `event_type`
- `created_at`

Relações:

- pertence a assistant e conversation

Índices importantes:

- `company_id`
- `assistant_id`
- `conversation_id`
- `created_at`

### 5.19 `settings`

Finalidade:

- configurações públicas e operacionais da empresa

Campos principais:

- `id`
- `company_id`
- `key`
- `value_json`
- `updated_at`

Relações:

- pertence a uma company

Índices importantes:

- `unique(company_id, key)`

### 5.20 `secrets`

Finalidade:

- armazenar segredos criptografados

Campos principais:

- `id`
- `company_id`
- `scope`
- `provider`
- `secret_type`
- `encrypted_value`
- `masked_hint`
- `last_rotated_at`
- `created_at`
- `updated_at`

Relações:

- pertence a uma company
- referencia settings, tools, channels ou providers

Índices importantes:

- `company_id`
- `scope`
- `provider`

---

## 6. Segurança

Regras obrigatórias:

- secrets só no backend
- criptografia em repouso
- nunca retornar secrets ao frontend
- logs não devem vazar tokens
- rate limit em endpoints públicos e de execução
- webhook signature para Cubo.Chat/Chatwoot
- separação por empresa em todas as queries
- permissões por usuário e por role

### Recomendações adicionais

- mascaramento consistente de secrets
- logs com redaction automático
- validação de payload de webhook
- TTL para sessões e tokens
- auditoria de alterações sensíveis
- rotação de segredos
- timeouts e retries controlados para tools

---

## 7. Integração com Cubo.Chat/Chatwoot

### Recebimento de evento de mensagem

1. Cubo.Chat envia webhook para o backend.
2. Backend valida assinatura.
3. Backend identifica canal, inbox, conversa e contato.
4. Backend localiza company e assistant vinculado.

### Como identificar empresa, inbox, conversa e contato

- `external_channel_id` ou `inbox_id` identifica o canal
- `external_conversation_id` identifica a conversa
- `contact_id` identifica o contato do provedor
- `company_id` vem do vínculo canal -> empresa

### Como decidir se a IA está ativa

Regras:

- canal está ativo
- assistant está ativo
- conversa não está pausada por humano
- empresa não excedeu limites
- configuração permite resposta automática

### Como enviar resposta

1. Runtime gera resposta.
2. Backend envia resposta ao Cubo.Chat/Chatwoot.
3. Mensagem de saída é registrada.
4. Status da conversa é atualizado.

### Como pausar IA quando humano assumir

Quando a plataforma detectar takeover humano:

- marcar conversa como assistida por humano
- pausar IA no canal/conversa
- suspender automação até regra de retorno

### Como transferir para humano

- gerar evento interno de handoff
- chamar ação do Cubo.Chat/Chatwoot
- registrar razão e timestamp
- manter logs e trilha de auditoria

### Como salvar logs

- cada decisão relevante gera `execution_logs`
- cada mensagem gera registro em `messages`
- cada uso de tokens gera `ai_usage_events`
- cada tool gera `tool_executions`

---

## 8. Runtime da IA

Fluxo esperado:

Mensagem recebida  
→ carregar contexto  
→ identificar assistente/canal  
→ buscar memória  
→ buscar conhecimento  
→ decidir se chama tool  
→ gerar resposta  
→ validar resposta  
→ enviar para Cubo.Chat  
→ salvar logs  
→ registrar consumo

### Regras do runtime

- nenhuma chamada direta do browser para modelos
- nenhum secret em prompt exposto ao cliente
- validação de saída antes de envio
- fallback para humano quando confiança baixa
- observabilidade em todo o fluxo

---

## 9. APIs necessárias

Endpoints REST esperados para conectar os services do frontend.

### Assistentes

- `GET /api/assistants`
- `POST /api/assistants`
- `GET /api/assistants/:id`
- `PUT /api/assistants/:id`
- `DELETE /api/assistants/:id`
- `POST /api/assistants/:id/publish`
- `POST /api/assistants/:id/test`
- `POST /api/assistants/:id/clone`

### Conhecimento

- `GET /api/knowledge-bases`
- `POST /api/knowledge-bases`
- `GET /api/knowledge-bases/:id`
- `PUT /api/knowledge-bases/:id`
- `DELETE /api/knowledge-bases/:id`
- `POST /api/knowledge-bases/:id/reindex`
- `POST /api/knowledge-bases/:id/upload-url`
- `POST /api/knowledge-bases/:id/upload-file`

### Tools

- `GET /api/tools`
- `POST /api/tools`
- `GET /api/tools/:id`
- `PUT /api/tools/:id`
- `DELETE /api/tools/:id`
- `POST /api/tools/:id/test`

### Canais

- `GET /api/channels`
- `POST /api/channels`
- `GET /api/channels/:id`
- `PUT /api/channels/:id`
- `DELETE /api/channels/:id`
- `POST /api/channels/:id/connect`
- `POST /api/channels/:id/disconnect`
- `POST /api/channels/:id/pause`
- `POST /api/channels/:id/resume`

### Testes

- `POST /api/tests/chat`
- `POST /api/tests/assistant`
- `GET /api/tests/:id`

### Logs

- `GET /api/logs`
- `GET /api/logs/:id`
- `GET /api/logs/:id/timeline`
- `GET /api/logs/export`

### Memória

- `GET /api/memories`
- `GET /api/memories/:id`
- `POST /api/memories`
- `DELETE /api/memories/:id`
- `DELETE /api/memories/clear-by-contact`

### Consumo

- `GET /api/usage/summary`
- `GET /api/usage/by-assistant`
- `GET /api/usage/by-channel`
- `GET /api/usage/by-model`
- `GET /api/usage/events`

### Configurações

- `GET /api/settings/ai`
- `GET /api/settings/ai/options`
- `PATCH /api/settings/ai`
- `POST /api/settings/ai/test`
- `DELETE /api/settings/ai/api-key`
- `GET /api/settings/cubo-chat`
- `PUT /api/settings/cubo-chat`
- `POST /api/settings/cubo-chat/test`
- `GET /api/settings/security`
- `PUT /api/settings/security`

### Webhooks Cubo.Chat

- `POST /api/webhooks/cubo-chat/message`
- `POST /api/webhooks/cubo-chat/conversation-update`
- `POST /api/webhooks/cubo-chat/contact-update`
- `POST /api/webhooks/cubo-chat/human-takeover`
- `POST /api/webhooks/cubo-chat/human-release`

---

## 10. Ordem de implementação

### Fase 0 — Preparação

Objetivo:

- fechar decisões técnicas
- definir stack
- definir contratos
- definir segurança

Tarefas:

- escolher runtime backend
- escolher banco
- definir estratégia de auth
- definir padrão de env/secrets
- definir schema inicial
- definir contratos REST

Critérios de aceite:

- arquitetura aprovada
- contratos mínimos documentados
- modelagem inicial validada

Riscos:

- tomar decisões cedo demais sem validar Cubo.Chat
- escolher stack incompatível com o time

### Fase 1 — Banco + Auth + Multiempresa

Objetivo:

- criar base segura da plataforma

Tarefas:

- companies
- users
- roles
- permissions
- sessão
- middleware de tenant
- isolamento por company

Critérios de aceite:

- usuário autenticado pertence a uma empresa
- queries são isoladas por company
- permissões básicas funcionando

Riscos:

- vazamento entre tenants
- auth sem sessão segura

### Fase 2 — CRUD Assistentes

Objetivo:

- permitir criar e editar assistentes

Tarefas:

- CRUD de assistants
- versionamento simples
- validação de prompt
- status do assistente
- publicação básica

Critérios de aceite:

- assistente criado, listado, editado e publicado

Riscos:

- modelagem insuficiente para evoluir

### Fase 3 — Knowledge simples

Objetivo:

- permitir base de conhecimento simples

Tarefas:

- CRUD de knowledge_bases
- upload simples
- ingestão inicial
- indexação básica
- vinculação com assistant

Critérios de aceite:

- assistente consegue usar conhecimento vinculado

Riscos:

- pipeline de ingestão lento ou instável

### Fase 4 — Tools / Webhooks

Objetivo:

- executar integrações server-side

Tarefas:

- CRUD de tools
- autenticação de saída
- timeout/retry
- sanitização de payload
- logs de execução

Critérios de aceite:

- tool HTTP executa com segurança

Riscos:

- vazamento de secrets
- chamadas externas sem timeout

### Fase 5 — Integração Cubo.Chat

Objetivo:

- conectar IA ao fluxo real de mensagens

Tarefas:

- webhooks de entrada
- mapeamento de inbox
- envio de resposta
- takeover humano
- pausa/retorno de IA

Critérios de aceite:

- mensagem recebida gera resposta no Cubo.Chat

Riscos:

- loop de resposta
- assinatura webhook mal tratada

### Fase 6 — Runtime IA

Objetivo:

- gerar respostas de forma segura

Tarefas:

- carregar contexto
- memória
- RAG
- decisão de tool
- validação de saída
- fallback humano

Critérios de aceite:

- runtime responde com contexto, logs e consumo

Riscos:

- latência alta
- resposta não validada

### Fase 7 — Logs

Objetivo:

- auditabilidade completa

Tarefas:

- execution_logs
- timeline
- export
- busca
- redaction

Critérios de aceite:

- suporte consegue auditar conversas e ações

Riscos:

- logs vazarem segredo ou PII

### Fase 8 — Consumo

Objetivo:

- monitorar custo e tokens

Tarefas:

- ai_usage_events
- summaries
- relatórios por assistente/canal/modelo
- alertas de limite

Critérios de aceite:

- dashboard de consumo básico disponível

Riscos:

- cálculo de custo inconsistente

### Fase 9 — Testes e hardening

Objetivo:

- elevar confiabilidade

Tarefas:

- testes de integração
- testes de contrato
- rate limit
- monitoramento
- tracing
- cache
- backup
- observabilidade

Critérios de aceite:

- sistema apto para operação com primeiro cliente

Riscos:

- dívida técnica acumulada nas fases anteriores

---

## 11. Decisões técnicas pendentes

Perguntas que precisam ser respondidas antes da implementação:

- Backend será Node/Nest/Fastify?
- Banco será Supabase/Postgres?
- Autenticação será própria ou herdada do Cubo.Chat?
- Onde secrets serão criptografados?
- Qual provider inicial de IA?
- Como será feito RAG?
- Como será feito deploy?

### Perguntas adicionais recomendadas

- haverá fila assíncrona desde o início?
- haverá cache para contexto e embeddings?
- o backend vai rodar em monólito modular ou serviços separados?
- qual estratégia de observabilidade será adotada?
- qual política de retenção de logs e memória será aplicada?

---

## 12. Recomendação final

O primeiro módulo a implementar deve ser:

**Auth + Multiempresa + Banco base**

### Por quê

- tudo no produto depende de tenant isolation
- sem isso, qualquer CRUD posterior pode vazar dados entre empresas
- sem auth segura, o frontend mockado não tem caminho correto para produção
- o resto da plataforma precisa saber quem é o usuário, qual empresa ele pertence e quais permissões possui

### Sequência ideal após isso

1. Auth + Multiempresa
2. Assistentes
3. Knowledge simples
4. Tools
5. Integração Cubo.Chat
6. Runtime IA
7. Logs
8. Consumo
9. Hardening

---

## Resumo executivo

Para o primeiro go-live, o backend deve ser enxuto e confiável:

- tenants isolados
- assistente simples
- conhecimento simples
- tools seguras
- Cubo.Chat integrado
- runtime auditável
- consumo mensurável

Tudo o que não servir para esse caminho deve ficar fora do MVP.
