# CuboChat Integration

Guia principal da integracao `CuboChat/Chatwoot -> Cubo AI Studio -> IA -> resposta no WhatsApp`.

Este documento concentra o fluxo real validado, setup local, comandos de teste, troubleshooting e pontos criticos de modelagem.

## 1. Visao geral

Fluxo ponta a ponta:

`WhatsApp -> CuboChat/Chatwoot -> webhook message_created -> Cubo AI Studio -> runtime da IA -> outbound Chatwoot -> WhatsApp`

Contexto validado localmente:

- API local em `http://localhost:3001`
- frontend local em `http://localhost:8080`
- para expor a API local usamos `cloudflared tunnel --url http://localhost:3001`
- o webhook publico usa `POST /webhooks/chatwoot?secret=SEU_SECRET`
- o evento correto no CuboChat e `message_created`
- o CuboChat nao envia header customizado para esse webhook, entao o segredo vai na query string

## 2. Local vs producao

Em ambiente local:

- a API roda em `http://localhost:3001`
- o frontend roda em `http://localhost:8080`
- a URL publica e temporaria, via Cloudflare Tunnel
- a URL do webhook muda quando o tunnel muda

Em producao:

- use uma URL fixa do backend
- o webhook do CuboChat deve apontar para:
  `https://api.seudominio.com/webhooks/chatwoot?secret=SEU_SECRET`
- Cloudflare Tunnel deve ser usado apenas para teste local

## 3. Fluxo validado em teste real

Fluxo validado:

1. O cliente envia uma mensagem no WhatsApp.
2. O CuboChat/Chatwoot gera o evento `message_created`.
3. O webhook chega na URL publica do Cloudflare Tunnel.
4. O backend do Cubo AI Studio recebe `POST /webhooks/chatwoot?secret=...`.
5. O backend valida o segredo pela query string.
6. O backend resolve `company`, `account`, `inbox` e `assistant`.
7. O backend cria ou reutiliza a conversa interna do Cubo AI Studio.
8. O runtime da IA processa a entrada.
9. O backend envia a resposta outbound ao CuboChat.
10. O CuboChat publica a resposta na conversa.
11. A resposta aparece no WhatsApp.

## 4. Identificadores reais validados

Valores usados no teste real validado:

- `account.id = 106`
- `inbox.id = 524`
- `conversation.id` externo do CuboChat = `1`

Ponto critico:

- o ID interno da conversa do Cubo AI Studio nao deve ser usado no outbound
- o outbound precisa usar sempre o `conversation.id` externo do CuboChat

## 5. Configurar o Cubo AI Studio

Na UI:

1. Abra `Configuracoes > Integracoes > Chatwoot`.
2. Cadastre ou edite a inbox.
3. Preencha:
   - `baseUrl`
   - `accountId`
   - `inboxId`
   - `assistantId`
   - `apiAccessToken`
   - `webhookSecret`
4. Salve.
5. Garanta que a inbox esteja ativa.
6. Garanta que o assistente vinculado esteja ativo.

Cada inbox ativa deve apontar para um assistente operacional real.

## 6. Configurar o webhook no CuboChat

Webhook correto:

`https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET`

Configuracao esperada:

- metodo: `POST`
- evento: `message_created`
- segredo: na query string

Nao dependa de header customizado para o segredo nesse fluxo.

## 7. Comandos principais

Subir API:

```bash
npm run api:restart
```

Testar API local:

```bash
curl -i http://localhost:3001/health
```

Subir tunnel:

```bash
cloudflared tunnel --url http://localhost:3001
```

Testar health publico:

```bash
curl -i https://SUA_URL_TRYCLOUDFLARE/health
```

Webhook publico para configurar no CuboChat:

```text
https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET
```

## 8. Como validar a API local

Com a API no ar:

```bash
curl -i http://localhost:3001/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "Cubo AI Studio API",
  "version": "0.1.0"
}
```

`Cannot GET /` no endpoint raiz e normal. O teste correto e `GET /health`.

## 9. Como validar a URL publica

Depois de subir o Cloudflare Tunnel:

```bash
curl -i https://SUA_URL_TRYCLOUDFLARE/health
```

Se isso falhar, o problema e de exposicao publica, nao do fluxo Chatwoot em si.

## 10. Curl manual do webhook

Exemplo minimo para reproduzir um webhook `message_created` incoming:

```bash
curl -i \
  -X POST "https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET" \
  -H "Content-Type: application/json" \
  -H "x-request-id: teste-manual-001" \
  -H "x-correlation-id: teste-manual-001" \
  -d '{
    "event": "message_created",
    "account": { "id": 106 },
    "inbox": { "id": 524, "identifier": "524" },
    "conversation": {
      "id": 1,
      "meta": { "title": "Conversa WhatsApp" }
    },
    "message": {
      "id": "manual-message-001",
      "content": "Oi, bom dia",
      "sender_type": "contact",
      "message_type": "incoming",
      "private": false,
      "attachments": []
    },
    "contact": {
      "id": "contact-001",
      "name": "Cliente Teste",
      "phone_number": "+5511999999999"
    }
  }'
```

Para replay local com fixture sanitizado:

```bash
CHATWOOT_REPLAY_BASE_URL=http://localhost:3001 \
CHATWOOT_REPLAY_SECRET=SEU_SECRET \
node scripts/replay-chatwoot-webhook.mjs apps/api/test/fixtures/chatwoot/message-text.json
```

## 11. Como testar pelo WhatsApp real

1. Confirme que a inbox do CuboChat esta conectada ao WhatsApp.
2. Confirme que o webhook do CuboChat aponta para a URL publica correta.
3. Confirme que a inbox no Cubo AI Studio tem `accountId`, `inboxId`, token e secret corretos.
4. Envie uma mensagem real para o numero conectado.
5. Verifique:
   - webhook recebido
   - conversa interna criada ou reutilizada
   - runtime executado
   - outbound enviado
   - resposta visivel no CuboChat
   - resposta visivel no WhatsApp

## 12. Como validar nos logs

Sinais importantes nos logs:

- webhook recebido
- tenant resolvido
- conversa externa resolvida
- runtime iniciado
- runtime concluido
- outbound iniciado
- outbound concluido

Campos uteis para rastrear:

- `requestId`
- `correlationId`
- `companyId`
- `account`
- `inbox`
- `externalConversation`
- `assistantMessageId`
- `status` do outbound

## 13. Contrato outbound correto

O envio outbound correto para o CuboChat usa:

```text
POST /api/v1/accounts/:account_id/conversations/:conversation_id/messages
```

Header correto:

```text
api_access_token: SEU_TOKEN
```

Body correto:

```json
{
  "content": "Sua resposta aqui",
  "message_type": "outgoing",
  "private": false
}
```

Pontos criticos:

- nao usar `Authorization: Bearer ...`
- nao usar `private: true`
- nao usar o ID interno da conversa do Cubo AI Studio
- usar sempre o `conversation.id` externo do CuboChat

## 14. Pontos criticos de modelagem

Regras importantes:

- nao usar `sender.id` ou `contact.id` do CuboChat como `userId` interno do Cubo AI Studio
- conversas externas podem existir com `userId = null`
- IDs externos devem ser preservados em metadata ou `externalPayload`
- `conversationId` interno e `conversation.id` externo sao coisas diferentes
- o outbound sempre usa o ID externo da conversa do CuboChat
- o webhook deve processar apenas mensagens `incoming`
- ignorar `outgoing`, `template`, `activity`, `private` e `agent_bot` para evitar loop

## 15. Troubleshooting

### EADDRINUSE na porta 3001

Use:

```bash
npm run api:port
npm run api:kill
npm run api:restart
```

### Cloudflare 1033 ou HTTP 530

Significa que o tunnel caiu ou a URL publica antiga morreu.

Resolucao:

1. subir `cloudflared tunnel --url http://localhost:3001` novamente
2. copiar a nova URL
3. atualizar o webhook no CuboChat
4. testar `/health` publico de novo

### Cannot GET /

Normal.

Teste:

```bash
curl -i http://localhost:3001/health
```

### Invalid Chatwoot webhook secret

Causa provavel:

- secret errado na query string

Resolucao:

- comparar o `secret` salvo no Cubo AI Studio com o `secret` configurado no webhook do CuboChat

### Payload sem conversation id

Causa provavel:

- payload com variacao de estrutura

Regra:

- o normalizador precisa aceitar formatos como `conversation.id`, `conversation_id`, `display_id` e equivalentes

### assistant_conversations_userId_fkey

Causa:

- tentativa de usar `sender.id` externo como `userId` interno

Resolucao:

- nao mapear IDs externos de Chatwoot para a FK de usuario interno
- em conversa inbound, `userId` interno pode ser `null`

### Outbound completed mas nao aparece no WhatsApp

Validar:

1. endpoint outbound correto
2. body com `message_type = outgoing`
3. body com `private = false`
4. `conversation.id` externo correto
5. `api_access_token` valido
6. status HTTP e body da resposta do CuboChat

## 16. Seguranca

Nunca commitar:

- `api_access_token` real
- `OPENAI_API_KEY`
- `webhookSecret`
- tokens administrativos

Use placeholders nos docs:

- `SEU_SECRET`
- `SEU_TOKEN`
- `SUA_URL_TRYCLOUDFLARE`

Se algum secret apareceu em print, log ou chat:

- rotacione esse secret depois do teste

Os logs devem ser sanitizados.

Nao registrar:

- segredo real
- token real
- payload bruto completo com dados sensiveis
- base64 de anexos

## 17. Referencias rapidas

- guia rapido: [CHATWOOT_E2E_QUICKSTART.md](./CHATWOOT_E2E_QUICKSTART.md)
- roteiro completo de validacao: [CHATWOOT_E2E_TEST.md](./CHATWOOT_E2E_TEST.md)
- diagnostico local: [API_LOCAL_DIAGNOSTICS.md](./API_LOCAL_DIAGNOSTICS.md)
- setup do backend: [BACKEND_SETUP.md](./BACKEND_SETUP.md)
