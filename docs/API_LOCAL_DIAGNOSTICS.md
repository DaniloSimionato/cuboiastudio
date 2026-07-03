# API Local Diagnostics

Comandos uteis:

```bash
npm run api:port
npm run api:kill
npm run api:restart
```

## Fluxo basico de diagnostico

Terminal 1:

```bash
npm run api:restart
```

Terminal 2:

```bash
cloudflared tunnel --url http://localhost:3001
```

Terminal 3:

```bash
curl -i http://localhost:3001/health
curl -i https://SUA_URL_TRYCLOUDFLARE/health
```

## API local esperada

- API local: `http://localhost:3001`
- frontend local: `http://localhost:8080`
- webhook publico do CuboChat:
  `https://SUA_URL_TRYCLOUDFLARE/webhooks/chatwoot?secret=SEU_SECRET`

## EADDRINUSE na porta 3001

Se a porta `3001` ja estiver ocupada:

```bash
npm run api:port
npm run api:kill
npm run api:restart
```

## Cloudflare 1033 ou HTTP 530

Isso normalmente significa:

- o tunnel caiu
- a URL antiga expirou
- o webhook do CuboChat ainda aponta para uma URL velha

Resolucao:

1. subir `cloudflared tunnel --url http://localhost:3001` novamente
2. copiar a nova URL publica
3. testar `curl -i https://SUA_URL_TRYCLOUDFLARE/health`
4. atualizar o webhook no CuboChat

## Cannot GET /

Isso e normal na raiz da API.

Teste correto:

```bash
curl -i http://localhost:3001/health
```

## Invalid Chatwoot webhook secret

Isso normalmente significa que o `secret` enviado nao bate com o configurado no backend.

Checklist:

- confirmar que o webhook usa `?secret=SEU_SECRET`
- confirmar que o `webhookSecret` salvo na inbox do Cubo AI Studio e o mesmo
- lembrar que o CuboChat nao envia header customizado nesse fluxo

## Payload sem conversation id

Quando o webhook nao traz a conversa no formato esperado, o backend nao consegue montar o outbound correto.

O normalizador precisa aceitar variacoes como:

- `conversation.id`
- `conversation_id`
- `display_id`

Regra pratica:

- o outbound sempre deve usar o ID externo da conversa do CuboChat
- nao usar o ID interno da conversa do Cubo AI Studio

## assistant_conversations_userId_fkey

Esse erro costuma acontecer quando um ID externo do CuboChat e usado como `userId` interno.

Regra correta:

- nao usar `sender.id` ou `contact.id` como `userId` interno
- conversas externas podem existir com `userId = null`
- IDs externos devem ser preservados em `metadata` ou `externalPayload`

## Outbound concluido mas sem resposta no WhatsApp

Validar:

1. endpoint correto:
   `POST /api/v1/accounts/:account_id/conversations/:conversation_id/messages`
2. header correto:
   `api_access_token`
3. body correto:

```json
{
  "content": "...",
  "message_type": "outgoing",
  "private": false
}
```

4. `conversation.id` externo correto
5. status HTTP e body retornados pelo CuboChat

## Checklist de logs

O log bom para diagnostico deve permitir rastrear:

- `requestId`
- `correlationId`
- `companyId`
- `account`
- `inbox`
- `externalConversation`
- status do outbound

Nao devem aparecer:

- `api_access_token`
- `webhookSecret`
- `OPENAI_API_KEY`
- payload bruto completo com dados sensiveis
- base64 ou conteudo privado completo
