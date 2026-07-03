# Chatwoot E2E Test

Este guia valida o fluxo real ponta a ponta:

`WhatsApp -> CuboChat/Chatwoot -> Cubo AI Studio -> IA -> CuboChat -> WhatsApp`

Use este roteiro quando quiser confirmar o comportamento em ambiente local, staging ou producao com uma inbox real.

Para um roteiro rapido, veja [CHATWOOT_E2E_QUICKSTART.md](./CHATWOOT_E2E_QUICKSTART.md).
Para o guia principal da integracao, veja [CUBOCHAT_INTEGRATION.md](./CUBOCHAT_INTEGRATION.md).

## Pre-requisitos

- API acessivel em `http://localhost:3001`
- frontend acessivel em `http://localhost:8080`
- inbox real do CuboChat/Chatwoot conectada ao WhatsApp
- `ChatwootInboxConfig` ativo no Cubo AI Studio
- assistente vinculado a inbox
- `apiAccessToken` e `webhookSecret` configurados
- URL publica valida quando estiver rodando localmente

## URL correta do webhook

Use sempre:

`POST /webhooks/chatwoot?secret=SEU_SECRET`

O segredo deve ir na query string. O CuboChat nao envia header customizado nesse fluxo.

## Passo a passo

1. Suba a API com `npm run api:restart`.
2. Suba o frontend com `npm run dev`.
3. Valide o health local com `curl -i http://localhost:3001/health`.
4. Exponha a API com:

```bash
cloudflared tunnel --url http://localhost:3001
```

5. Valide o health publico com:

```bash
curl -i https://SUA_URL_TRYCLOUDFLARE/health
```

6. Configure o webhook do CuboChat:
   `https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET`
7. Ative o evento `message_created`.
8. Envie uma mensagem real pelo WhatsApp.
9. Valide a resposta no CuboChat e acompanhe os logs no backend.

## Fluxo real validado

Identificadores validados no teste real:

- `account.id = 106`
- `inbox.id = 524`
- `conversation.id` externo do CuboChat = `1`

O que deve acontecer:

1. o CuboChat envia `message_created`
2. o backend valida o `secret`
3. o backend resolve `company`, `account`, `inbox` e `assistant`
4. a conversa interna e criada ou reutilizada
5. o runtime executa
6. o outbound usa o `conversation.id` externo
7. a resposta aparece no CuboChat
8. a resposta aparece no WhatsApp

## Checklist de mensagens

### 1. Texto simples

- Envie: `Oi, bom dia`
- Esperado:
  - webhook recebido
  - conversa interna criada ou reutilizada
  - runtime chamado
  - resposta voltando ao CuboChat

### 2. Pergunta objetiva

- Envie: `Qual o horario de atendimento?`
- Esperado:
  - runtime interpreta o contexto
  - resposta textual coerente
  - outbound no CuboChat sem loop

### 3. Imagem com texto

- Envie um print ou foto com texto legivel
- Esperado:
  - `Entrada interpretada` mostra descricao da imagem
  - OCR ou texto detectado aparece no debug
  - runtime recebe o conteudo extraido

### 4. Audio curto

- Envie um audio curto com uma pergunta
- Esperado:
  - transcricao salva no anexo
  - `Entrada interpretada` mostra a transcricao
  - runtime recebe a transcricao real

### 5. PDF com texto

- Envie um PDF com texto selecionavel
- Esperado:
  - texto extraido aparece no debug
  - o conteudo e truncado se necessario
  - a resposta usa o texto do documento

### 6. Documento invalido ou muito grande

- Envie um arquivo incompatível ou acima do limite configurado
- Esperado:
  - fallback honesto
  - `processingStatus = failed`
  - erro seguro em `processingError`
  - o runtime nao finge que leu o arquivo

### 7. Mensagem duplicada

- Reenvie o mesmo payload ou simule duplicidade local
- Esperado:
  - o backend ignora a duplicata
  - o runtime nao e chamado duas vezes
  - o outbound nao e duplicado

### 8. Evento outgoing ou bot

- Valide um evento enviado pelo proprio Cubo ou por bot/agente
- Esperado:
  - webhook ignorado
  - nenhuma resposta automatica
  - sem loop infinito

### 9. Inbox sem assistente

- Use uma inbox ativa sem assistente vinculado
- Esperado:
  - webhook resolvido com seguranca
  - runtime nao e chamado
  - erro seguro registrado

### 10. Inbox desconhecida

- Reenvie o webhook com `accountId` ou `inboxId` sem configuracao
- Esperado:
  - rejeicao segura
  - nenhum runtime chamado
  - log seguro com tenant ou inbox nao resolvidos

## O que validar nos logs

Cada webhook real deve ser rastreavel por:

- `requestId`
- `correlationId`
- `companyId`
- `chatwootAccountId`
- `chatwootInboxId`
- `chatwootConversationId`
- `chatwootMessageId`
- `assistantId`
- quantidade de anexos
- status do download
- status da interpretacao
- status do runtime
- status do outbound

Os logs nunca devem expor:

- token
- segredo
- base64
- payload bruto inteiro
- conteudo completo de arquivos
- texto sensivel completo

## Como confirmar o outbound

O envio correto usa:

```text
POST /api/v1/accounts/:account_id/conversations/:conversation_id/messages
```

Com:

- header `api_access_token`
- body com `message_type = "outgoing"`
- body com `private = false`
- `conversation_id` externo do CuboChat

Depois da resposta do Cubo:

1. abra a conversa no CuboChat
2. confirme que a resposta caiu na conversa correta
3. confirme que nao houve loop de webhook
4. se houver erro, valide status e body da resposta do CuboChat

## Replay local

Use os fixtures sanitizados:

- `apps/api/test/fixtures/chatwoot/message-text.json`
- `apps/api/test/fixtures/chatwoot/message-image.json`
- `apps/api/test/fixtures/chatwoot/message-audio.json`
- `apps/api/test/fixtures/chatwoot/message-pdf.json`
- `apps/api/test/fixtures/chatwoot/message-outgoing.json`
- `apps/api/test/fixtures/chatwoot/message-duplicate.json`

Exemplo:

```bash
CHATWOOT_REPLAY_BASE_URL=http://localhost:3001 \
CHATWOOT_REPLAY_SECRET=SEU_SECRET \
node scripts/replay-chatwoot-webhook.mjs apps/api/test/fixtures/chatwoot/message-text.json
```

## Troubleshooting rapido

- `EADDRINUSE`: rode `npm run api:port`, `npm run api:kill`, `npm run api:restart`
- `Cloudflare 1033` ou `HTTP 530`: tunnel caiu ou URL expirou; suba o tunnel de novo e atualize o webhook
- `Cannot GET /`: normal; teste `GET /health`
- `Invalid Chatwoot webhook secret`: `secret` errado na query string
- `assistant_conversations_userId_fkey`: nao use `sender.id` externo como `userId` interno
- outbound concluido mas nao aparece no WhatsApp: valide endpoint, `api_access_token`, `message_type`, `private` e `conversation.id` externo

## Regras que devem permanecer verdadeiras

- nao usar `sender.id` ou `contact.id` como `userId` interno
- conversas externas podem existir com `userId = null`
- preservar IDs externos em `metadata` ou `externalPayload`
- diferenciar `conversationId` interno de `conversation.id` externo
- o webhook deve processar apenas mensagens `incoming`
- ignorar `outgoing`, `template`, `activity`, `private` e `agent_bot`
- nao usar `Authorization: Bearer ...`; usar `api_access_token`
- nao responder com `private: true`
