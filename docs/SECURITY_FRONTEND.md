# SECURITY_FRONTEND — Cubo AI Studio

Este documento define os limites de segurança do frontend. Toda integração real
de IA (OpenAI, Anthropic, Gemini, OpenRouter), Cubo.Chat/Chatwoot, webhooks de
ferramentas e provedores externos **deve obrigatoriamente passar pelo backend**.

> ⚠️ O frontend é uma camada de apresentação. Ele **não detém segredos**.

---

## ✅ O que o frontend PODE fazer

- Exibir status seguro retornado pelo backend
  (`runtimeEnabled`, `provider`, `baseUrl`, `model`, `apiKeyConfigured`).
- Coletar credenciais via inputs **mascarados** (`MaskedSecretInput`) e enviá-las
  ao backend através de endpoints internos (`/api/...`) sobre HTTPS.
- Em desenvolvimento local, enviar apenas os headers de auth dev necessários
  (`x-dev-user-id`, `x-dev-company-id`, `x-dev-user-email`) para a API local;
  isso nunca deve ocorrer em produção.
- A API local deve aceitar as origens `http://localhost:5173`,
  `http://localhost:8080`, `http://localhost:8081`, `http://localhost:8082`
  e outras portas `localhost` usadas pelo Vite em desenvolvimento.
- Renderizar configurações públicas (modelo padrão, temperatura, URLs públicas,
  flags de comportamento).
- Renderizar e editar a configuração tenant-only de IA em `/configuracoes`
  sem armazenar API key no navegador.
- Carregar presets seguros de provider/modelo/timeout via `GET /settings/ai/options`.
- Solicitar ao backend o **teste** de uma conexão (`POST /api/.../test`) e
  exibir o resultado.
- Exibir diagnostico sanitizado do provider, como `providerStatus` e mensagem segura, sem JSON bruto grande.
- Renderizar dados mockados em desenvolvimento.

## ❌ O que o frontend NUNCA pode fazer

- **Nunca** armazenar API keys de OpenAI/Anthropic/Gemini/OpenRouter, tokens de
  Cubo.Chat/Chatwoot, webhook secrets ou qualquer credencial sensível no
  bundle, `localStorage`, `sessionStorage`, IndexedDB ou cookies acessíveis por
  JS.
- **Nunca** persistir a API key do tenant em texto puro no frontend, mesmo que
  ela tenha sido digitada na tela de configuracao.
- **Nunca** chamar diretamente as APIs de OpenAI, Anthropic, Gemini,
  OpenRouter ou Chatwoot/Cubo.Chat com tokens administrativos a partir do
  navegador. Isso vazaria o segredo a qualquer usuário ou extensão.
- **Nunca** colocar tokens reais (ou com formato real, ex.: `sk-...`) em
  arquivos mock, constantes, `.env` client-side, comentários ou exemplos.
- **Nunca** logar payloads com credenciais no console.
- **Nunca** confiar em flags de "permissão" calculadas só no cliente para
  decisões sensíveis — o backend é a fonte da verdade.
- **Nunca** enviar headers de desenvolvimento fora do ambiente local.

## 🔐 Como secrets devem ser enviados ao backend

1. O usuário digita a credencial em um `MaskedSecretInput` (campo de senha,
   `autocomplete="off"`).
2. O frontend faz `POST` para um endpoint interno, ex.:
   - `PATCH /api/settings/ai` — `{ runtimeEnabled, provider, baseUrl, model, apiKey, requestTimeoutMs }`
   - `POST /api/settings/cubo-chat` — `{ baseUrl, token, webhookSecret }`
   - `POST /api/tools` — `{ ..., auth: { type, token } }`
   - `POST /api/channels` — `{ ... }`
3. O backend **criptografa em repouso** (KMS/secret manager) e devolve apenas
   estado seguro: `{ runtimeEnabled, provider, baseUrl, model, apiKeyConfigured }`.
4. O frontend descarta a variável local com a credencial imediatamente após o
   envio. Não há "edição" do segredo armazenado — apenas substituição.

Se o backend retornar erro `400` ao salvar uma chave, a UI deve mostrar a mensagem segura do
corpo da resposta. Um caso comum em desenvolvimento e `APP_ENCRYPTION_KEY` ausente ou invalida;
nesse caso a chave nao e salva e o backend nunca devolve o segredo digitado.

Se `POST /settings/ai/test` retornar erro do provider, o frontend pode mostrar apenas campos
sanitizados (`providerStatus`, `providerError.message`, `providerError.type`, `providerError.code`
ou `providerError.param`). Nunca mostrar headers, request completo, chave digitada ou body bruto
com tamanho grande.

## 🚫 Por que OpenAI/Chatwoot não podem ser chamados direto do navegador

- Qualquer chamada `fetch` a `api.openai.com` a partir do bundle expõe o header
  `Authorization: Bearer ...` em DevTools, extensões e proxies do usuário.
- A chave é **conta-wide**: um vazamento permite consumo ilimitado, exfiltração
  de dados de outros clientes e cobrança em nome da empresa.
- O mesmo vale para tokens administrativos do Chatwoot/Cubo.Chat, que dão
  acesso a inboxes, conversas e contatos de **todos** os clientes.
- O backend resolve isso atuando como **proxy autenticado**: aplica RBAC,
  rate-limit, auditoria, mascara dados sensíveis e injeta a credencial
  server-side.

## 📦 Organização do frontend

```
src/
  components/       UI reutilizável (incluindo MaskedSecretInput, ConnectionStatusBadge…)
  routes/           Páginas (TanStack file-based routing)
  services/         Camada de chamadas ao backend interno (/api/*) — sem APIs externas
  types/            Tipos compartilhados (Agent, Tool, AIProviderSettings…)
  data/mock/        Dados mockados para desenvolvimento
  hooks/            Hooks reutilizáveis
docs/               Documentação (este arquivo)
```

Todos os services apontam exclusivamente para `/api/*`. Nenhum service
importa SDKs de OpenAI/Anthropic/etc.

## Logs de runtime

A tela `/logs` pode exibir dados de `GET /logs/ai` e `GET /logs/ai/:id`, mas apenas como metadados seguros.

Permitido exibir:

- modo, status, provider, modelo e duracao
- fallback e motivo
- erro sanitizado do provider
- contadores de contexto
- ids internos de rastreio

Proibido exibir ou reconstruir:

- API key
- headers ou `Authorization`
- prompt completo
- system prompt completo
- body bruto enviado ao provider
- resposta bruta completa do provider
- stack trace
