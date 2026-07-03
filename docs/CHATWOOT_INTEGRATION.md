# Chatwoot Integration

Este documento continua como referencia complementar da integracao Chatwoot, mas o guia principal atualizado agora e [CUBOCHAT_INTEGRATION.md](./CUBOCHAT_INTEGRATION.md).

Use o guia principal quando precisar:

- configurar o webhook real
- subir API local e Cloudflare Tunnel
- testar `GET /health` local e publico
- reproduzir o fluxo ponta a ponta validado
- diagnosticar erros reais do outbound para o WhatsApp

## Resumo tecnico

Esta integracao usa o mesmo pipeline para:

- webhooks reais do Chatwoot
- tela `/testes`
- interpretacao multimodal de anexos
- runtime do assistente
- resposta outbound de volta ao Chatwoot

## Configuracao por tenant e inbox

Use `GET /settings/chatwoot/inboxes`, `POST /settings/chatwoot/inboxes`, `PATCH /settings/chatwoot/inboxes/:id`, `DELETE /settings/chatwoot/inboxes/:id` e `POST /settings/chatwoot/inboxes/:id/test` para gerenciar configuracoes sem expor segredos no frontend.

Na UI, a secao fica em `Configuracoes > Integracoes > Chatwoot` e usa o tenant ativo do painel.

Cada registro salva:

- `companyId`
- `assistantId`
- `name`
- `baseUrl`
- `accountId`
- `inboxId`
- `apiAccessToken`
- `webhookSecret`
- `isActive`
- `metadataJson`

Os tokens sao criptografados no backend. O frontend recebe apenas campos seguros e flags como `apiAccessTokenConfigured`.

## Webhook esperado

Endpoint principal:

`POST /webhooks/chatwoot?secret=SEU_SECRET`

Evento esperado:

- `message_created`

O backend ignora:

- eventos que nao sejam `message_created`
- mensagens `outgoing`, `template` ou `activity`
- mensagens com `private = true`
- mensagens com `sender.type = agent_bot`
- inbox ou account sem configuracao ativa
- inbox ativa sem assistente vinculado

Regra de resolucao:

- o webhook usa `accountId` + `inboxId` para localizar a `ChatwootInboxConfig`
- a config define qual `assistantId` respondera
- o segredo e validado pela query string

## Outbound correto

O envio de resposta usa:

```text
POST /api/v1/accounts/:account_id/conversations/:conversation_id/messages
```

Com:

- header `api_access_token`
- body com `message_type = "outgoing"`
- body com `private = false`
- `conversation_id` externo do CuboChat

Nunca use o ID interno da conversa do Cubo AI Studio no outbound.

## Regras de seguranca e modelagem

- nao usar `sender.id` ou `contact.id` como `userId` interno
- conversas externas podem existir com `userId = null`
- IDs externos devem ser preservados em `metadata` ou `externalPayload`
- nao logar token, segredo, base64 ou payload bruto completo

## Anexos e download autenticado

O downloader tenta, nesta ordem:

- `data_url`
- `url`
- `thumb_url`

Quando houver `apiAccessToken`, ele envia autenticacao para o Chatwoot usando o header `api_access_token`.

Se `data_url` ainda nao estiver disponivel no primeiro webhook:

- o anexo e marcado como `pending`
- o pipeline nao inventa conteudo
- uma entrega futura pode chegar por `message_updated`

## Teste local

Fluxo operacional recomendado:

1. subir a API local
2. abrir `cloudflared tunnel --url http://localhost:3001`
3. configurar o webhook `POST /webhooks/chatwoot?secret=SEU_SECRET`
4. ativar o evento `message_created`
5. configurar um `ChatwootInboxConfig` para `accountId` + `inboxId`
6. vincular um assistente real
7. enviar texto, imagem, audio ou PDF pela conversa

Para o roteiro operacional completo, veja:

- [CUBOCHAT_INTEGRATION.md](./CUBOCHAT_INTEGRATION.md)
- [CHATWOOT_E2E_QUICKSTART.md](./CHATWOOT_E2E_QUICKSTART.md)
- [CHATWOOT_E2E_TEST.md](./CHATWOOT_E2E_TEST.md)
- [API_LOCAL_DIAGNOSTICS.md](./API_LOCAL_DIAGNOSTICS.md)
