# Chatwoot E2E Quickstart

Roteiro curto para validar o fluxo real:

`WhatsApp -> CuboChat/Chatwoot -> Cubo AI Studio -> IA -> Chatwoot -> WhatsApp`

Para o guia principal e o contexto completo, veja [CUBOCHAT_INTEGRATION.md](./CUBOCHAT_INTEGRATION.md).

## Checklist rapida

```bash
# 1) Subir a API
npm run api:restart
```

```bash
# 2) Subir o frontend
npm run dev
```

```bash
# 3) Confirmar health local
curl -i http://localhost:3001/health
```

```bash
# 4) Abrir tunnel
cloudflared tunnel --url http://localhost:3001
```

```bash
# 5) Confirmar health publico
curl -i https://SUA_URL_TRYCLOUDFLARE/health
```

```text
# 6) Configurar no CuboChat
https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET
```

```bash
# 7) Replay local com fixture sanitizado
CHATWOOT_REPLAY_BASE_URL=http://localhost:3001 \
CHATWOOT_REPLAY_SECRET=SEU_SECRET \
node scripts/replay-chatwoot-webhook.mjs apps/api/test/fixtures/chatwoot/message-text.json
```

## Ambiente validado

- API local em `http://localhost:3001`
- frontend local em `http://localhost:8080`
- Cloudflare Tunnel com `cloudflared tunnel --url http://localhost:3001`
- webhook publico em `POST /webhooks/chatwoot?secret=SEU_SECRET`
- evento correto no CuboChat: `message_created`

## Fluxo rapido

1. Suba a API com `npm run api:restart`.
2. Suba o frontend com `npm run dev`.
3. Teste `GET /health` local.
4. Abra o Cloudflare Tunnel.
5. Teste `GET /health` publico.
6. Configure o webhook do CuboChat com a URL publica e `?secret=SEU_SECRET`.
7. Ative o evento `message_created`.
8. Envie uma mensagem no WhatsApp real ou rode um replay local.
9. Confirme a resposta no CuboChat e no WhatsApp.

## Teste manual por webhook

Exemplo minimo:

```bash
curl -i \
  -X POST "https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "account": { "id": 106 },
    "inbox": { "id": 524, "identifier": "524" },
    "conversation": { "id": 1 },
    "message": {
      "id": "manual-message-001",
      "content": "Oi, bom dia",
      "sender_type": "contact",
      "message_type": "incoming",
      "private": false,
      "attachments": []
    }
  }'
```

## O que confirmar

- o backend recebeu o webhook
- o `secret` foi validado na query string
- a inbox ativa foi resolvida por `accountId` + `inboxId`
- a conversa usou o `conversation.id` externo do CuboChat
- o runtime foi executado
- o outbound usou:
  - endpoint `POST /api/v1/accounts/:account_id/conversations/:conversation_id/messages`
  - header `api_access_token`
  - body com `message_type: "outgoing"` e `private: false`
- a resposta apareceu no CuboChat
- a resposta apareceu no WhatsApp

## Problemas comuns

| Problema | Causa provavel | Acao |
| --- | --- | --- |
| `EADDRINUSE` | porta `3001` ocupada | `npm run api:port`, `npm run api:kill`, `npm run api:restart` |
| `Cloudflare 1033` ou `HTTP 530` | tunnel caiu ou URL antiga expirou | subir `cloudflared` de novo e atualizar o webhook |
| `Cannot GET /` | teste feito na rota errada | usar `curl -i http://localhost:3001/health` |
| `Invalid Chatwoot webhook secret` | secret errado na query string | revisar `?secret=SEU_SECRET` |
| outbound nao aparece no WhatsApp | conversation externa errada, token invalido ou body incorreto | revisar endpoint, `api_access_token`, `message_type` e `private` |

## Regras que nao podem escapar

- nao usar `sender.id` ou `contact.id` como `userId` interno
- conversas externas podem ter `userId = null`
- nao usar `Authorization: Bearer ...` no outbound
- nao enviar `private: true`
- nao usar o ID interno da conversa do Cubo AI Studio no outbound
- ignorar eventos `outgoing`, `template`, `activity`, `private` e `agent_bot` para evitar loop
