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
8. O Runtime V1 cria uma identidade, captura o estado de controle e processa a
   entrada.
9. Uma unica decisao terminal e selada.
10. O executor persiste resposta, runtime log e delivery `PENDING`.
11. O checkpoint pre-outbound valida `contextVersion`, `controlRevision`,
    `aiActive` e `pausedByHuman`.
12. O vencedor do claim registra uma attempt e envia pelo sender V1.
13. O Chatwoot retorna ack, falha ou resultado ambiguo.
14. Ledger e manifesto registram o resultado conhecido.
15. O CuboChat publica a resposta na conversa quando aceitou o outbound.
16. A resposta pode entao aparecer no WhatsApp.

Ack do POST nao deve ser descrito como prova de entrega final ao usuario.

Pedido humano explicito segue uma variante fail-closed do mesmo fluxo:

1. o Runtime V1 sela `OPERATIONAL_HUMAN_HANDOFF`, sem provider;
2. persiste uma operacao unica de handoff;
3. bloqueia a IA localmente por CAS e incrementa `controlRevision`;
4. le a conversa Chatwoot para resolver um assignee ou team ja existente;
5. envia `PUT` somente para tornar `ai_active=false`;
6. executa novo `GET` e verifica conversa, account, inbox, estado, status e
   destino;
7. somente depois da verificacao positiva cria a confirmacao visivel;
8. entrega essa confirmacao pelo ledger outbound existente.

Um 2xx da mutacao nao e suficiente. Falha, ambiguidade, destino ausente ou
estado remoto contraditorio preservam o bloqueio local e nao produzem texto de
sucesso.

Quando o processo interrompe essa sequencia, o recovery de handoff continua a
mesma operacao, sem criar nova decisao:

1. revalida `contextVersion`, `controlRevision`, `aiActive=false` e
   `pausedByHuman=true`;
2. disputa um lease e registra a tentativa;
3. executa GET antes de qualquer mutation recuperada;
4. se o remoto ja estiver correto, avanca sem novo PUT;
5. repete mutation somente com safety comprovada, budget e backoff validos;
6. cria ou reutiliza uma unica confirmacao por decisao/ordinal;
7. entrega ou reconcilia a confirmacao pelo ledger outbound existente.

Quando o turno usa knowledge, o Runtime V1 segue outra separacao obrigatoria:

1. recupera o `AssistantKnowledgeChunk.content` integral do PostgreSQL;
2. seleciona chunks pelo ranking e scope atuais;
3. cria um artefato factual efemero com hash, tamanho e score;
4. extrai autoridades e spans sobre o conteudo integral;
5. constroi excerpts limitados ao redor dos anchors relevantes;
6. envia somente esses excerpts ao provider, quando ele e permitido;
7. registra no manifesto apenas IDs, hashes, tamanhos, offsets, coverage e
   campos comerciais sanitizados.

O preview de 250 caracteres continua util para diagnostico, mas nao pode ser
usado como evidencia, autoridade, guard ou unico contexto factual do provider.

## 4. Identificadores sanitizados de exemplo

Use identificadores ficticios na documentacao e em fixtures:

- `account.id = 9001`
- `inbox.id = 9002`
- `conversation.id` externo do CuboChat = `9003`

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
    "account": { "id": 9001 },
    "inbox": { "id": 9002, "identifier": "inbox-test" },
    "conversation": {
      "id": 9003,
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
      "phone_number": "<TELEFONE_FICTICIO>"
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
- decisao selada
- delivery criado
- attempt/lease adquirido
- outbound iniciado
- outbound reconhecido, falho, incerto ou cancelado
- reconciliacao, quando executada

Campos uteis para rastrear:

- `requestId`
- `correlationId`
- `companyId`
- `account`
- `inbox`
- `externalConversation`
- `assistantMessageId`
- `turnExecutionId`
- `decisionId`
- `deliveryId`
- `handoffOperationId`
- `attemptNumber`
- `controlRevision`
- `currentContextVersion`
- `retrySafety`
- `handoff.recovery.safety`
- `handoff.recovery.attemptNumber`
- `handoff.recovery.leaseOwner`
- `handoff.recovery.nextEligibleAt`
- `evidence.schemaVersion`
- `evidence.items[].contentHash`
- `evidence.items[].contentLength`
- `evidence.items[].factualSpans`
- `evidence.provider.totalExcerptChars`
- `evidence.provider.excerpts[].spans`
- `evidence.authority.selected`
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
  "private": false,
  "sender_type": "Captain::Assistant",
  "content_attributes": {
    "automation_rule_id": "cubo_ai_studio",
    "source": "cubo_ai_studio",
    "assistant_id": "ID_TECNICO_DO_ASSISTANT",
    "internal_conversation_id": "ID_TECNICO_DA_CONVERSA",
    "cubo_outbound_delivery_id": "ID_TECNICO_DO_DELIVERY"
  }
}
```

Pontos criticos:

- nao usar `Authorization: Bearer ...`
- nao usar `private: true`
- nao usar o ID interno da conversa do Cubo AI Studio
- usar sempre o `conversation.id` externo do CuboChat
- preservar `cubo_outbound_delivery_id`; ele permite reconciliacao positiva sem
  comparar texto ou telefone
- nao assumir que esse atributo e uma chave de idempotencia remota

## 14. Ledger, tentativa e recovery seguro

Antes de qualquer POST outbound existe um `AssistantOutboundDelivery`
persistido e unico por decisao/bloco.

Estados:

- `PENDING`: registrado, sem tentativa;
- `SENDING`: um owner possui lease da tentativa;
- `ACKNOWLEDGED`: Chatwoot respondeu com sucesso;
- `FAILED_RETRYABLE`: somente elegivel quando `retrySafety=PROVEN_SAFE`;
- `FAILED_TERMINAL`: nao repetir automaticamente;
- `UNCERTAIN`: efeito remoto pode ter ocorrido; nunca reenviar diretamente;
- `CANCELLED_STALE`: controle local mudou antes do envio.

Cada attempt preserva owner, ordinal, lease, entrada na fronteira, resultado,
status HTTP e erro sanitizado.

Regras:

- timeout e socket ambiguo exigem reconciliacao;
- 5xx recebido nao prova ausencia do efeito;
- lease expirado depois da fronteira vira `UNCERTAIN`;
- duplicate de webhook nao dispara recovery;
- budget e backoff limitam apenas novos envios;
- reconciliacao sem reenvio continua possivel quando o budget acabou;
- controle stale cancela o delivery;
- confirmacao de handoff remoto verificado referencia a mesma operacao pelo
  `handoffOperationId`;
- resposta dividida ou payload historico sem contrato verificavel nao e
  recuperado automaticamente.

Evidencia positiva de reconciliacao:

- external message ID ja persistido;
- mensagem remota com `cubo_outbound_delivery_id` exatamente igual ao delivery.

Ausencia em uma pagina de mensagens nao e conclusiva.

O coordinator de recovery nao esta automaticamente ativo. Nao existe cron,
worker, endpoint ou hook de startup para executa-lo.

Essa observacao se refere ao recovery geral de outbound. O handoff possui um
runner proprio no Bloco 4B, mas ele fica OFF por padrao e e bloqueado em
staging/producao. Quando uma confirmacao de handoff ja possui delivery, o
coordinator de handoff apenas delega ao recovery outbound existente.

Validacao local principal:

```bash
cd apps/api
npm run test:http-harness
```

O harness usa `AppModule`, bootstrap, webhook, Prisma, Redis e Runtime V1 reais.
Somente Chatwoot e provider sao fronteiras HTTP falsas e stateful.

## 15. Handoff humano operacional

O pedido explicito de atendimento humano nao e mais representado apenas por
`content_attributes.handoff=true` ou pelo texto
`Transferindo para um atendente...`.

O owner persistente e `AssistantHandoffOperation`, unico por decisao e chave
idempotente. A operacao registra, de forma sanitizada:

- turno, decisao, conversa interna e `contextVersion`;
- revisao aceita e revisao produzida pelo bloqueio;
- resolucao do destino;
- resultado da mutacao e da verificacao remotas;
- autorizacao e delivery da confirmacao;
- estado parcial, concluido ou superseded.

O CAS local exige a mesma conversa, versao, revisao, `aiActive=true` e
`pausedByHuman=false`. Na mesma transacao ele grava `aiActive=false`,
`pausedByHuman=true`, incrementa `controlRevision` e marca a operacao como
localmente bloqueada.

Destinos humanos validos neste contrato:

1. assignee ja presente na conversa;
2. team ja presente, quando nao existe assignee.

Inbox sem assignee ou team nao e considerada fila humana comprovada. O bloco
nao cria ou altera assignee, team, labels ou status e nao possui IDs hardcoded.
O status remoto observado precisa permanecer compativel com atendimento humano.

A sequencia remota e `GET -> PUT ai_active=false -> GET`. A segunda leitura
precisa confirmar exatamente:

- conversation, account e inbox esperados;
- `ai_active=false`;
- status compativel;
- o mesmo assignee ou team resolvido na primeira leitura.

Somente entao o executor cria a mensagem de confirmacao e o
`AssistantOutboundDelivery`. Se esse outbound falhar, o handoff continua
valido e fica `CONFIRMATION_PENDING`; o recovery outbound pode recuperar apenas
a confirmacao, sem repetir a mutacao remota.

Quando mutacao ou verificacao falham ou ficam ambiguas:

- a IA local permanece bloqueada;
- nenhuma confirmacao de sucesso e criada;
- a operacao fica `RECONCILIATION_REQUIRED`;
- duplicate do webhook apenas reutiliza a operacao;
- nenhuma mutation e repetida sem safety comprovada.

Reset concorrente invalida a autorizacao pela mudanca de `contextVersion` e
`controlRevision`, marca a operacao anterior como `SUPERSEDED` e impede
confirmacao stale.

### 15.1 Recovery de operacoes parciais

Status e safety sao dimensoes separadas. Os valores de safety sao:

- `PROVEN_SAFE`;
- `VERIFY_REMOTE_FIRST`;
- `NOT_RETRYABLE`;
- `UNKNOWN`.

`AssistantHandoffAttempt` registra owner, ordinal, lease, entrada na fronteira,
resultado da mutation, verificacao e erro sanitizado. Lease expirado antes da
fronteira pode voltar a ser elegivel depois do backoff. Lease expirado depois
da fronteira exige GET e reconciliacao; nunca autoriza PUT direto.

Matriz resumida:

- `REQUESTED`: somente CAS local original;
- `LOCALLY_BLOCKED`: GET e primeira mutation ainda nao iniciada;
- `REMOTE_PENDING`: GET primeiro;
- `RECONCILIATION_REQUIRED`: GET primeiro e mutation apenas com
  `PROVEN_SAFE`;
- `REMOTE_CONFIRMED`: criar ou reutilizar confirmacao;
- `CONFIRMATION_PENDING`: recovery somente do delivery;
- `COMPLETED`, `FAILED_TERMINAL` e `SUPERSEDED`: no-op automatico.

O GET precisa confirmar o mesmo scope externo. Assignee ou team alterado por
uma intervencao humana pode ser aceito se ainda for um destino valido, a IA
permanecer inativa e o status continuar compativel. Destino removido nao e
recriado ou substituido por presuncao.

A confirmacao e deterministica e idempotente. Mensagem, delivery e transicao
para `CONFIRMATION_PENDING` sao protegidos por transacao e pela unicidade
existente de decisao/ordinal. O coordinator nao chama provider e nao cria uma
segunda decisao.

### 15.2 Ativacao do runner

Default:

```env
HANDOFF_RECOVERY_ENABLED=false
```

O runner periodico:

- e registrado no lifecycle da aplicacao;
- nao agenda trabalho com a flag OFF;
- impede execucoes sobrepostas;
- encerra timer e aguarda a execucao ativa no shutdown;
- e bloqueado em `staging` e `production` mesmo com a flag ligada neste bloco.

Nao existe endpoint publico para disparar recovery. Nenhuma configuracao real
de ambiente foi alterada e esta documentacao nao representa ativacao ou deploy.

## 16. Pontos criticos de modelagem

Regras importantes:

- nao usar `sender.id` ou `contact.id` do CuboChat como `userId` interno do Cubo AI Studio
- conversas externas podem existir com `userId = null`
- IDs externos devem ser preservados em metadata ou `externalPayload`
- `conversationId` interno e `conversation.id` externo sao coisas diferentes
- o outbound sempre usa o ID externo da conversa do CuboChat
- o webhook deve processar apenas mensagens `incoming`
- ignorar `outgoing`, `template`, `activity`, `private` e `agent_bot` para evitar loop
- duplicate reutiliza turno, decisao e delivery; ele nao chama provider, sender
  ou recovery
- Runtime V2 permanece OFF
- handoff explicito usa `OPERATIONAL_HUMAN_HANDOFF`; somente operacao remota
  verificada pode produzir confirmacao de transferencia
- recovery de handoff reutiliza a operacao e decisao originais; mutation
  ambigua sempre passa por GET
- `CONFIRMATION_PENDING` reutiliza o ledger outbound e nao repete a mutation
- o caminho de handoff acionado por flow permanece separado e nao deve ser
  confundido com o contrato explicito do Bloco 4A

### Evidencia factual, excerpt e preview

A fonte original e `AssistantKnowledgeChunk.content`. Durante um turno
selecionado, `FactualEvidenceArtifact` conserva acesso efemero ao texto
integral; `ProviderEvidenceExcerpt` leva somente spans limitados ao provider; e
`EvidencePreview` existe apenas para observabilidade.

O budget padrao do provider e:

- no maximo 5 chunks;
- no maximo 1.600 caracteres por excerpt;
- no maximo 4.800 caracteres somados.

Cache de vetor da query nao substitui texto factual. Em cache hit, os chunks
canonicos continuam sendo lidos do PostgreSQL. Nenhuma dessas representacoes
autoriza persistir knowledge integral no manifesto, runtime log, mensagem,
delivery ou operacao de handoff.

## 17. Troubleshooting

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

### Outbound acknowledged mas nao aparece no WhatsApp

Validar:

1. endpoint outbound correto
2. body com `message_type = outgoing`
3. body com `private = false`
4. `conversation.id` externo correto
5. `api_access_token` valido
6. status HTTP e body da resposta do CuboChat
7. `AssistantOutboundDelivery.status`
8. external message ID persistido

`ACKNOWLEDGED` confirma apenas que o Chatwoot aceitou o POST conhecido pelo
runtime. Nao comprova entrega final no WhatsApp.

### Delivery UNCERTAIN

Nao repita manualmente apenas porque nao houve ack.

Validar:

1. attempt e `boundaryStartedAt`
2. `retrySafety`
3. external message ID local
4. referencia `cubo_outbound_delivery_id` nas mensagens remotas
5. resultado da reconciliacao

Se a consulta remota for inconclusiva, preserve `UNCERTAIN`.

### Handoff localmente bloqueado sem confirmacao

Esse estado e intencionalmente fail-closed.

Validar:

1. `AssistantHandoffOperation.status`;
2. resolucao de assignee ou team;
3. resultado da mutacao;
4. resultado do GET de verificacao;
5. `contextVersion` e revisoes esperada/pos-bloqueio;
6. `errorCode` sanitizado;
7. se a operacao foi `SUPERSEDED` por reset concorrente.

Nao envie confirmacao manual automatizada nem reative a IA apenas porque a
mutation retornou sucesso.

Para recovery local controlado, valide:

1. `recoverySafety`;
2. `attemptOwner`, inicio e expiracao do lease;
3. `boundaryStartedAt` da tentativa;
4. `nextEligibleAt` e budget;
5. resultado do GET de reconciliacao;
6. se a confirmacao ja possui delivery;
7. se a operacao foi `SUPERSEDED`.

Com `VERIFY_REMOTE_FIRST` ou `UNKNOWN`, nao repita mutation manualmente.

## 18. Seguranca

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
- conteudo integral duplicado no ledger ou manifesto
- response body remoto completo
- owner de lease bruto; use fingerprint tecnico
- IDs de destino humano em logs livres; no manifesto use referencia tecnica
  sanitizada

## 19. Referencias rapidas

- guia rapido: [CHATWOOT_E2E_QUICKSTART.md](./CHATWOOT_E2E_QUICKSTART.md)
- roteiro completo de validacao: [CHATWOOT_E2E_TEST.md](./CHATWOOT_E2E_TEST.md)
- diagnostico local: [API_LOCAL_DIAGNOSTICS.md](./API_LOCAL_DIAGNOSTICS.md)
- setup do backend: [BACKEND_SETUP.md](./BACKEND_SETUP.md)
- harness HTTP: [README.production-http-harness.md](../apps/api/test/README.production-http-harness.md)
- relatorio Bloco 3B.2: [BLOCK3B2_OUTBOUND_RECOVERY_REPORT.md](../apps/api/test/BLOCK3B2_OUTBOUND_RECOVERY_REPORT.md)
- relatorio Bloco 4A: [BLOCK4A_OPERATIONAL_HANDOFF_REPORT.md](../apps/api/test/BLOCK4A_OPERATIONAL_HANDOFF_REPORT.md)
- relatorio Bloco 4B: [BLOCK4B_HANDOFF_RECOVERY_REPORT.md](../apps/api/test/BLOCK4B_HANDOFF_RECOVERY_REPORT.md)
- relatorio Bloco 5A: [BLOCK5A_INTEGRAL_EVIDENCE_REPORT.md](../apps/api/test/BLOCK5A_INTEGRAL_EVIDENCE_REPORT.md)
