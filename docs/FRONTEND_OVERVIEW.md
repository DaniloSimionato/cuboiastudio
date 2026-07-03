# Cubo AI Studio — Frontend Overview

## 1. Visão geral do projeto

- **Nome do projeto:** Cubo AI Studio
- **Objetivo:** Plataforma SaaS para criação, configuração, teste e publicação de agentes de IA voltados ao atendimento multicanal. Permite que empresas montem agentes com prompts, bases de conhecimento, ferramentas/webhooks, fluxos e canais de publicação.
- **Foco atual:** Integração visual e funcional com o ecossistema **Cubo.Chat** (Chatwoot-like), permitindo publicar agentes diretamente em caixas de entrada do Cubo.Chat.
- **Status atual:** Frontend **seguro e parcialmente conectado ao backend local**. As telas principais de Assistentes, Base de Conhecimento, Teste/runtime, Configurações de IA por tenant e a barra superior já consomem a API local em desenvolvimento. Em produção, o frontend continua apontando para a mesma origem (`/api/*`) e não chama provedores externos diretamente pelo navegador. Ferramentas e Flow Builder continuam em modo demonstrativo local até as issues próprias do backend. O plano do cerebro da IA esta documentado em `docs/AI_RUNTIME_PLAN.md` e qualquer provider real continua sendo responsabilidade exclusiva do backend. A tela `/agentes` agora edita `initialMessage`, `instructions`, `model` e `temperature`, a tela `/configuracoes` salva a configuração tenant-only com API key cifrada no backend, e a tela `/testes` exibe o Runtime Pipeline v1 com modo, contexto, saida e resumo.

---

## 2. Stack utilizada

- **Framework:** [TanStack Start v1](https://tanstack.com/start) (React 19 + SSR + Server Functions) sobre **Vite 7**.
- **Linguagem:** TypeScript (modo `strict`).
- **Bibliotecas principais:**
  - `@tanstack/react-router` — roteamento file-based tipado.
  - `@tanstack/react-query` — cache/estado de dados assíncronos.
  - `tailwindcss v4` — estilo utilitário via `src/styles.css`.
  - `shadcn/ui` + `radix-ui` — primitivos acessíveis (Dialog, Tabs, Dropdown, etc.).
  - `lucide-react` — ícones.
  - `recharts` — gráficos do Dashboard.
  - `sonner` — toasts.
  - `zod` — validação de schemas (preparada para uso nos services).

### Estrutura de rotas

Rotas file-based em `src/routes/`:

- `__root.tsx` — shell HTML, providers globais.
- `index.tsx` — landing/redirect para o app.
- `_app.tsx` — layout autenticado (Sidebar + Topbar + `<Outlet />`).
- `_app.dashboard.tsx`
- `_app.agentes.tsx` / `_app.agentes.$agentId.tsx`
- `_app.conhecimento.tsx`
- `_app.ferramentas.tsx`
- `_app.flow.tsx`
- `_app.canais.tsx`
- `_app.testar.tsx`
- `_app.logs.tsx`
- `_app.variaveis.tsx`
- `_app.memoria.tsx`
- `_app.configuracoes.tsx`

### Organização de pastas

Veja a seção 3 abaixo.

### Como rodar localmente

```bash
npm install
npm run dev
```

A aplicação pode subir em `http://localhost:8080`, `http://localhost:8081` ou
`http://localhost:8082` dependendo das portas ocupadas no momento. Em
desenvolvimento, `VITE_API_URL` define o backend local usado pelos services; se
a variável não existir, o frontend assume `http://localhost:3001`.

O backend local aceita as origens `http://localhost:5173`, `http://localhost:8080`,
`http://localhost:8081` e `http://localhost:8082` para evitar `Failed to fetch`
na demo visual.

---

## 3. Estrutura de pastas

- **`src/components`** — Componentes de UI reutilizáveis (layout, primitivos shadcn, componentes de domínio como `MaskedSecretInput`, `ConnectionStatusBadge`, `SecurityNotice`, `Cards`, `Tables`).
- **`src/pages`** — _Não utilizado._ TanStack Start usa `src/routes/`. Caso encontre, é legado e deve ser removido.
- **`src/services`** — Camada de acesso a dados. Cada service expõe funções tipadas que **apenas** chamam endpoints internos via `apiClient`. Nenhum SDK externo é importado aqui.
- **`src/types`** — Definições TypeScript compartilhadas (entidades de domínio, estados de conexão, payloads seguros).
- **`src/data/mock`** — Dados fictícios usados em todas as telas enquanto o backend não existe (clientes, agentes, bases, ferramentas, canais, logs, memórias, variáveis).
- **`src/hooks`** — Hooks utilitários (ex.: cliente atual, paginação, toggles de UI).
- **`docs`** — Documentação do projeto (este arquivo, `SECURITY_FRONTEND.md`, e futuros `CUBO_AI_ARCHITECTURE.md`).

---

## 4. Páginas criadas

### Dashboard (`/dashboard`)

- **Finalidade:** Visão geral por cliente — KPIs de conversas, taxa de resolução, tempo médio, custo estimado de tokens, intenções mais frequentes.
- **Principais componentes:** `KpiCard`, gráficos `recharts` (bar/line), `IntentTable`.
- **Dados mockados:** `mock/dashboard.ts`, `mock/agents.ts`.
- **APIs futuras:** `GET /api/dashboard/summary`, `GET /api/dashboard/intents`.

### Agentes (`/agentes`)

- **Finalidade:** Listar, filtrar, duplicar e arquivar agentes de IA do cliente atual.
- **Principais componentes:** `AgentsTable`, filtros, badge de status, ações em linha.
- **Dados mockados:** `mock/agents.ts`.
- **APIs futuras:** `GET /api/agents`, `POST /api/agents`, `DELETE /api/agents/:id`.

### Criar/Editar Agente (`/agentes/:agentId`)

- **Finalidade:** Edição completa de um agente em 7 abas: Informações, Prompt, Conhecimento, Ferramentas, Memória, Segurança e Publicação.
- **Principais componentes:** `Tabs`, `PromptEditor`, seletor de bases, seletor de tools, `MaskedSecretInput` (chaves de canal), `ConnectionStatusBadge`.
- **Dados mockados:** `mock/agents.ts`, `mock/knowledge.ts`, `mock/tools.ts`.
- **APIs futuras:** `GET/PUT /api/agents/:id`, `POST /api/agents/:id/publish`.
- **Nota atual:** o editor de Assistentes da demo já permite persistir `initialMessage`, `instructions`, `model` e `temperature` no backend local. A mensagem inicial é usada ao criar uma conversa nova.

### Base de Conhecimento (`/conhecimento`)

- **Finalidade:** Gerenciar bases (arquivos, URLs, FAQs) que alimentam o RAG dos agentes.
- **Principais componentes:** `KnowledgeTable`, modal de upload, indicador de indexação.
- **Dados mockados:** `mock/knowledge.ts`.
- **APIs futuras:** `GET/POST/DELETE /api/knowledge`, `POST /api/knowledge/:id/reindex`.

### Ferramentas (`/ferramentas`)

- **Finalidade:** Cadastro de tools/webhooks que o agente pode invocar (function calling).
- **Principais componentes:** `ToolsTable`, editor de schema JSON, `MaskedSecretInput` para headers/tokens, `SecurityNotice`.
- **Dados mockados / demonstrativos:** `mock/tools.ts`.
- **Estado atual:** permanece em modo demonstrativo até a BE-022.
- **APIs futuras:** `GET/POST/PUT/DELETE /api/tools`, `POST /api/tools/:id/test`.

### Flow Builder (`/flow`)

- **Finalidade:** Editor visual (simulado) de fluxos de conversa — nós de mensagem, condição, chamada de tool e transferência humana.
- **Principais componentes:** Canvas mock com nodes e edges, painel de propriedades.
- **Dados mockados / demonstrativos:** `mock/flows.ts`.
- **Estado atual:** interação visual estabilizada para demo local; persistência ainda futura.
- **APIs futuras:** `GET/PUT /api/agents/:id/flow`.

### Canais (`/canais`)

- **Finalidade:** Conectar agentes a canais do Cubo.Chat (WhatsApp, Web, Instagram, etc.).
- **Principais componentes:** Cards por canal, `ConnectionStatusBadge`, `MaskedSecretInput`, `SecurityNotice`.
- **Dados mockados:** `mock/channels.ts`.
- **APIs futuras:** `GET /api/channels`, `POST /api/channels/:id/connect`, `POST /api/channels/:id/disconnect`.

### Testes (`/testes`)

- **Finalidade:** Sandbox de chat para validar um agente com painel de _debug_ baseado nas 7 partes do Assistente.
- **Principais componentes:** `ChatWindow`, `DebugPanel`, seletor de agente/versão.
- **Dados mockados:** Respostas simuladas em `mock/testRuns.ts`.
- **APIs futuras:** `POST /api/agents/:id/chat` (streaming SSE).
- **Nota atual:** a tela `/testes` já consome o runtime persistido do backend e mostra `IA real` ou `determinístico` conforme o modo retornado. O painel de debug exibe mensagem inicial, instruções, contexto/fontes, quantidade de histórico recente usada, flags de mensagem inicial/persona incluídas, modelo/temperatura, inatividade conceitual, saída (`success`/`fallback`), razão de fallback e resumo da última execução.
- **Estado por assistant:** ao trocar o assistente, a tela limpa conversa ativa, mensagens, preview/runtime antigos e recarrega apenas conversas daquele assistant. Se o backend responder `Conversation not found`, a UI limpa a seleção e orienta o usuário a escolher outra conversa ou criar uma nova.
- **Dados técnicos:** assistants com prefixo `[SMOKE]` ou nomes legados `Assistente Smoke Test...` ficam ocultos no seletor padrão do laboratório para não poluir validações manuais.

### Logs (`/logs`)

- **Finalidade:** Auditoria de execuções — quem disse o quê, qual tool foi chamada, qual prompt foi enviado, custo.
- **Principais componentes:** `LogsTable`, drawer de detalhes com timeline.
- **Dados mockados:** `mock/logs.ts`.
- **APIs futuras:** `GET /api/logs`, `GET /api/logs/:id`.

### Variáveis (`/variaveis`)

- **Finalidade:** Gerenciar variáveis de contexto (`{{cliente.nome}}`, `{{empresa.horario}}`) por cliente.
- **Principais componentes:** `VariablesTable`, modal de criação.
- **Dados mockados:** `mock/variables.ts`.
- **APIs futuras:** `GET/POST/PUT/DELETE /api/variables`.

### Memória (`/memoria`)

- **Finalidade:** Consultar e limpar memória de longo prazo por contato/agente.
- **Principais componentes:** `MemoryTable`, `ConfirmDialog` para limpeza.
- **Dados mockados:** `mock/memory.ts`.
- **APIs futuras:** `GET /api/memory`, `DELETE /api/memory/:id`.

### Configurações (`/configuracoes`)

- **Finalidade:** Configurar o provider de IA por tenant, com chave criptografada no backend.
- **Principais componentes:** `MaskedSecretInput`, `SecurityNotice`, selects de provider/modelo/timeout, cards de status e formulário seguro de save/test/remove.
- **Dados mockados:** não há mais mock principal para a configuração de IA; a tela usa `GET /settings/ai`, `GET /settings/ai/options` e `PATCH /settings/ai`.
- **APIs atuais:** `GET /settings/ai`, `GET /settings/ai/options`, `PATCH /settings/ai`, `POST /settings/ai/test`, `DELETE /settings/ai/api-key`.
- **Nota:** OpenAI e DeepSeek aparecem como presets de UI, `Custom` libera `baseUrl`/modelo manuais, e o teste de conexao fica bloqueado ate existir configuracao salva. Quando o provider rejeita a chamada, a tela mostra mensagem sanitizada e `providerStatus` discreto. A API key nunca volta do backend.

---

## 5. Componentes reutilizáveis

- **`MaskedSecretInput`** — Input para segredos. Nunca exibe o valor real vindo do backend; usa um `storedHint` (ex.: `sk-••••1234`) e permite digitar um valor novo, que é enviado apenas no `submit`.
- **`ConnectionStatusBadge`** — Badge visual com estados `connected | disconnected | testing | error`.
- **`SecurityNotice`** — Banner discreto explicando que credenciais ficam apenas no servidor.
- **`ConfirmDialog`** — Modal de confirmação para ações destrutivas (excluir, limpar memória, revogar canal).
- **`LoadingState`** — Skeletons + spinner padronizados.
- **`EmptyState`** — Estado vazio com ilustração, título, descrição e CTA.
- **`ErrorState`** — Erro com botão de _retry_.
- **`Cards`** — Cards de KPI, de canal, de agente.
- **`Tables`** — Tabela base com ordenação, paginação e filtros, usada em Agentes, Logs, Tools, Conhecimento, Memória e Variáveis.
- **`Forms`** — Wrappers de `react-hook-form` + `zod` com mensagens de erro padronizadas.

---

## 6. Services criados

Todos vivem em `src/services/` e dependem do `apiClient`. **Nenhum** importa SDK de provedor externo. **Nenhum** lê variáveis de ambiente com segredos.

- **`apiClient`** — `fetch` wrapper para a API interna. Em desenvolvimento usa `VITE_API_URL` (fallback `http://localhost:3001`) e injeta headers dev seguros para o backend local; em produção usa `/api`. Erros de rede são traduzidos para uma mensagem orientativa sobre `npm run api:start`, e erros sanitizados de provider preservam `providerStatus`/`providerError` para a UI.
- **`currentCompanyService`** — `GET /companies/current`.
- **`backendAssistantsService`** — `GET/POST/PATCH /assistants`, `PATCH /assistants/:id/status`, `POST /assistants/:id/preview`, `POST /assistants/:id/run`, `GET/POST/PATCH/DELETE /assistants/:assistantId/knowledge`. Os payloads de create/update já carregam `instructions`, `model` e `temperature`.
- **`backendConversationsService`** — `GET/POST /assistants/:assistantId/conversations` e `GET/POST /assistants/:assistantId/conversations/:conversationId/messages`.
- **`aiSettingsService`** — `GET/PATCH /settings/ai`, `GET /settings/ai/options`, `POST /settings/ai/test`, `DELETE /settings/ai/api-key`.
- **`aiProviderService`** — serviço legado/mock ainda existente para a demo antiga de provider. O fluxo real de IA por tenant usa `aiSettingsService` e `GET/PATCH /settings/ai`.
- **`cuboChatService`** — `getSettings()`, `updateSettings()`, `listInboxes()`, `testConnection()`. Aponta para `/api/settings/cubochat` e `/api/cubochat/*`.
- **`toolsService`** — CRUD + `testTool()`. Aponta para `/api/tools`.
- **`agentsService`** — CRUD + `publish()`, `chat()`. Aponta para `/api/agents`.
- **`knowledgeService`** — CRUD + `reindex()`, `upload()`. Aponta para `/api/knowledge`.
- **`logsService`** — `list()`, `get()`, `export()`. Aponta para `/api/logs`.

> **Regra:** o frontend só conversa com o próprio backend. Toda integração com OpenAI, Anthropic, Cubo.Chat, Chatwoot, etc., é feita **server-side**.

## 9. Estado da demo local

- Conectadas ao backend real: barra superior, `/agentes`, `/conhecimento`, `/testes`.
- Ainda demonstrativas: `/ferramentas`, `/flow`.
- A API local usada pela demo é `http://localhost:3001`.
- O frontend em desenvolvimento pode aparecer em `http://localhost:8080`, `http://localhost:8081` ou `http://localhost:8082`.

---

## 7. Tipos TypeScript

Definidos em `src/types/index.ts`:

- **`Agent`** — id, nome, descrição, status, modelo, prompt, versões, canais publicados.
- **`KnowledgeBase`** — id, nome, tipo (`file | url | faq`), status de indexação, contagem de chunks.
- **`Tool`** — id, nome, descrição, schema JSON, método HTTP, URL, headers (apenas hints mascarados no frontend).
- **`Channel`** — id, tipo (`whatsapp | webchat | instagram | ...`), inboxId Cubo.Chat, estado de conexão.
- **`Memory`** — id, contatoId, agentId, conteúdo, ttl, criadoEm.
- **`ExecutionLog`** — id, agentId, canal, mensagens, tools chamadas, tokens, custo, status.
- **`AIProviderSettings`** — provider, modelo padrão, `maskedKey`, `hasKey`.
- **`AiSettings`** — configuração tenant-only de IA com `apiKeyConfigured`, `lastTestAt` e `source` seguro.
- **`AiSettingsOptions`** — presets seguros de provider/modelo/timeout para a tela `/configuracoes`.
- **`CuboChatSettings`** — baseUrl, accountId, `maskedKey`, `hasKey`, status.
- **`SecureStatus`** — `{ hasValue: boolean; maskedHint?: string; updatedAt?: string }` — formato canônico que o backend retorna para qualquer segredo.
- **`ConnectionState`** — `'connected' | 'disconnected' | 'testing' | 'error'`.

---

## 8. Dados mockados

Centralizados em `src/data/mock/`:

```
mock/
  clients.ts
  agents.ts
  knowledge.ts
  tools.ts
  channels.ts
  flows.ts
  logs.ts
  memory.ts
  variables.ts
  settings.ts
  dashboard.ts
  testRuns.ts
```

Os services em `src/services/` ainda preservam os mocks usados pelas telas não conectadas. As telas de Assistentes, Base de Conhecimento, Teste/runtime e Topbar já consomem o backend local real.

---

## 9. Segurança do frontend

Resumo das diretrizes (detalhes em `docs/SECURITY_FRONTEND.md`):

- O frontend **não armazena** tokens sensíveis (OpenAI, Anthropic, Cubo.Chat, etc.).
- O frontend **não chama OpenAI/Anthropic diretamente**.
- O frontend **não chama Cubo.Chat/Chatwoot** com token administrativo.
- **Nenhum** secret é salvo em `localStorage` ou `sessionStorage`.
- Campos sensíveis usam `MaskedSecretInput` e exibem apenas hints (`sk-••••1234`) retornados pelo backend.
- Secrets digitados pelo usuário são enviados **uma única vez** ao backend via `/api/*`.
- O **backend** é responsável por criptografar em repouso, gerenciar rotação e nunca devolver o valor pleno ao frontend.
- Autenticação será baseada em **cookie httpOnly** emitido pelo backend (sem tokens JWT em `localStorage`).

---

## 10. Integração futura com backend

O backend deverá implementar, no mínimo:

- **Autenticação** (login, refresh, logout) com cookies httpOnly + CSRF.
- **Multiempresa** (tenant por `clientId`, isolamento de dados, RLS).
- **CRUD de agentes** + versionamento + publicação.
- **CRUD de bases de conhecimento** + pipeline de ingestão/embedding/RAG.
- **CRUD de tools/webhooks** + execução server-side com timeout e retries.
- **Integração Cubo.Chat/Chatwoot** (webhooks de entrada, envio de mensagens, gestão de inboxes).
- **Motor de execução da IA** (orquestração prompt → RAG → tools → resposta, streaming SSE).
- **Logs e auditoria** com retenção configurável.
- **Publicação por canal** (vínculo agente ↔ inbox, ativar/desativar).
- **Cofre de segredos** (KMS/Vault) para chaves de provedores e tokens de canais.

---

## 11. Próximos passos recomendados

1. Criar `docs/CUBO_AI_ARCHITECTURE.md` descrevendo módulos do backend, contratos `/api/*` e fluxo de mensagens.
2. Definir o **banco de dados** (schema multiempresa, tabelas para agentes, bases, tools, canais, logs, memória, segredos cifrados).
3. Implementar o **backend por módulos**, na ordem: Auth → Agentes → Conhecimento → Tools → Canais (Cubo.Chat) → Execução → Logs.
4. **Conectar os services** (`src/services/*`) aos endpoints reais, removendo os imports de `src/data/mock`.
5. Manter a **segurança dos secrets no backend** (KMS, criptografia em repouso, rotação, never-return-plain).
6. Testar o **fluxo completo com Cubo.Chat**: criar agente → publicar em inbox → receber mensagem real → resposta gerada → log auditável.

---

_Documento gerado para a fase de preparação pré-backend do Cubo AI Studio. Atualize-o sempre que a arquitetura do frontend mudar._

## Atualizacao - logs reais de IA

A tela `/logs` agora consome o backend real:

- `GET /logs/ai`
- `GET /logs/ai/:id`

O service `logsService` deixou de usar mock para esta tela e retorna `AiRuntimeLogListItem` / `AiRuntimeLogDetail`.

A UI exibe metadados seguros:

- data/hora
- assistant
- modo e status
- provider e modelo
- duracao
- fallback/reason
- outcome
- contadores de contexto

A UI nao exibe prompt completo, resposta bruta do provider, API key, headers ou qualquer segredo.
