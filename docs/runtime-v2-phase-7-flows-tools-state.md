# Fase 7 — auditoria de flows, ferramentas e estado operacional

## Escopo e estado da auditoria

Esta auditoria é somente de código e contratos locais. Não executa provider,
ferramenta, webhook, Google Calendar, Chatwoot ou outbound e não consulta
staging/produção.

Base auditada: `58cea34`.

Estado operacional esperado durante a auditoria:

- Runtime V2: `OFF`;
- Evidence Mode: `OFF`;
- State Store: `POSTGRES`;
- allowlist: vazia;
- V1 continua responsável por provider, ferramentas e outbound.

Nenhum segredo, payload real, prompt ou dado de cliente é reproduzido neste
documento.

## 1. Inventário de flows

### Modelo e persistência

O modelo Prisma `AssistantFlow` está em `apps/api/prisma/schema.prisma` e é
vinculado a um `Assistant`. Os principais campos são:

- `active`, `priority`;
- `triggerKeywords`, `triggerDescription`, `triggerExamples`;
- `flowInstructions`, `knowledgeScope`;
- `allowedToolSlugs`, `toolContext`;
- `finalAction`, `fixedMessage`, `autoRespond`, `requiresHuman`;
- `handoffTeamId`, `handoffTeamName`, `chatwootLabels`.

O CRUD read/write está em `apps/api/src/assistant-flows/assistant-flows.service.ts`.
As consultas são escopadas por `assistantId` e pelo `companyId` do assistente.

O flow é orientação operacional. O modelo não contém `authorityLevel`,
`sourceType`, validade factual ou proveniência de fatos. Portanto, instruções,
descrições e nomes de flow não autorizam preço, disponibilidade, horário,
contato ou política empresarial.

### Seleção V1

O caminho principal está em:

- `apps/api/src/intent-router/intent-router.service.ts`;
- `apps/api/src/intent-router/intent-routing.ts`;
- `apps/api/src/assistant-conversations/assistant-conversations.service.ts`.

O roteador:

1. descarta mensagem vazia e flows inativos;
2. calcula candidatos para todos os flows ativos;
3. usa aliases derivados de `triggerKeywords` e do texto configurado;
4. usa score de evidências;
5. usa prioridade somente como desempate, depois `flowId` como desempate
   determinístico;
6. exige score mínimo para seleção por palavra-chave;
7. usa fallback semântico do provider quando não há match suficiente;
8. impede a seleção de flow de visita externa sem evidência explícita de
   visita, local, endereço ou deslocamento.

O fallback semântico é dependente de provider e, portanto, não é
determinístico no mesmo sentido do caminho de keywords. A resposta do provider
é reduzida a um ID de flow conhecido; respostas que não correspondem a um ID
resultam em fallback.

### Entrada no prompt

Quando há provider V1 configurado e runtime habilitado, o flow selecionado:

- entra como `flow` no `PromptCompilerService`;
- fornece objetivo, campos conhecidos/pendentes e regras de uma pergunta por
  vez para a triagem;
- restringe as ferramentas por `allowedToolSlugs`;
- pode aplicar `toolContext` de calendário;
- pode desviar para `fixed_message` ou `handoff`.

Quando o flow não é selecionado, o prompt recebe a instrução de que não há
flow atual. O contexto oficial, RAG, memória e histórico são tratados em
camadas separadas.

### Estado anterior e troca de intenção

O V1 não possui um campo persistido próprio equivalente a `pendingFlow` ou
`currentFlow` no modelo de conversa. O flow selecionado é registrado por turno
em `AssistantRuntimeLog`/metadata e usado durante aquela execução.

A continuidade de triagem é mantida principalmente por cache:

`triage:<companyId>:<conversationId>`

Esse estado contém `active`, `requestedDetail`, `requestedDetailKey`,
`lastQuestion`, `knownFieldKeys`, `pendingFieldKeys`, tentativa e expiração.
Preço explícito, agenda, lista, pedido de humano e incapacidade do cliente
podem limpar ou encerrar a triagem.

O V1 não persiste uma transição formal de flow com revisão, motivo, origem e
contextVersion. Essa é uma lacuna para a Fase 7.

O V2 possui `selectedFlowId`, `flowStage` e `pendingFields` em
`ConversationState`, mas o Shadow atual apenas observa sinais do V1 e executa
planejamento/manifesto; não executa flow nem ferramenta.

## 2. Inventário de ferramentas

### Google Calendar

| Operação | Implementação | Efeito | Confirmação atual |
|---|---|---|---|
| disponibilidade | `GoogleCalendarAvailabilityService.checkAvailability` | leitura de FreeBusy e ocupação local | não exige confirmação |
| criar booking | `GoogleCalendarBookingService.createBooking` | cria evento externo e registro local | exige por padrão; pode ser sobrescrita por configuração |
| listar bookings | `findBookingsByContact` | leitura de registros locais | não exige confirmação |
| remarcar | `rescheduleBooking` | altera evento externo e booking local | exige por padrão; pode ser sobrescrita |
| cancelar | `cancelBooking` | remove/cancela evento externo e booking local | exige por padrão; pode ser sobrescrita |

O facade é `apps/api/src/apps/calendar-tools.service.ts`. Os serviços reais
estão em `apps/api/src/apps/google-calendar/`.

O escopo é `companyId`, instalação ativa, recurso ativo, credencial Google
ativa e, quando configurado, `toolContext.calendar` do flow. A execução valida
assistente, instalação, configuração de ferramenta, permissão READ/WRITE e
escopo de recurso/reserva.

Os DTOs estão em `apps/api/src/apps/dto/calendar-tool.dto.ts` e validam datas,
intervalos, duração, recurso, contato e limites de consulta.

### Custom Webhook

O modelo é `CustomWebhookAction`, com service/runtime em
`AssistantConversationsService.executeTool` e CRUD em
`apps/api/src/apps/apps.service.ts`/`webhook-actions.controller.ts`.

O schema configurável inclui método, URL, headers, autenticação cifrada,
template de body, JSON Schema de parâmetros, timeout, permissão, confirmação e
filtro de resposta.

Há controles relevantes:

- empresa e instalação ativa obrigatórias;
- configuração do assistente pode desabilitar a ação;
- permissão READ impede métodos mutáveis;
- validação de profundidade e JSON Schema;
- placeholders limitados ao schema;
- `secureFetch` com controles de SSRF/limites;
- timeout configurável, padrão do modelo: 5 segundos;
- resposta filtrável;
- logs de ação sanitizados.

Não foi encontrado contrato de idempotency key ou replay protection específico
para custom webhook.

### Ferramentas Chatwoot

Não foi encontrado um catálogo de ferramentas Chatwoot para operações de
labels, assignment ou status exposto ao provider. O sistema possui integração
de webhook, atualização de `ai_active`, envio de mensagens e diagnóstico, mas
essas operações não formam ainda uma interface de tool-call genérica para o
V2.

### Status

- Google Calendar: operacional no V1, com leitura e mutações externas;
- custom webhook: operacional no V1, com efeitos externos conforme método;
- Chatwoot outbound/`ai_active`: operacional no V1, fora do V2;
- handoff: parcial;
- execução de ferramentas pelo V2: inexistente por desenho;
- adapters fake do V2: apenas testes, sem conexão operacional.

## 3. Caminho de execução V1

```text
Chatwoot webhook ou endpoint interno
  → normalização e validação do ingresso
  → resolução tenant/inbox/assistente
  → deduplicação por externalMessageId
  → persistência da mensagem do cliente
  → memória V1 e RAG V1, quando habilitados
  → triagem/cache
  → roteamento de flow
  → resolução de ferramentas e escopos
  → PromptCompiler V1
  → provider V1
  → loop de tool calls (até 5 iterações)
  → validação de argumentos/escopo/confirmação
  → execução da ferramenta V1
  → resultado como mensagem role=tool
  → provider V1 continua a resposta
  → persistência da resposta e runtime log
  → outbound Chatwoot, quando a origem é Chatwoot
  → extração de memória V1 em background
  → agendamento assíncrono do Shadow V2
```

Pontos relevantes:

- o provider decide tool calls;
- `prepareToolExecution` aplica `toolContext` de calendário e bloqueia escopo;
- `executeTool` valida empresa, assistente, instalação, configuração e
  permissão;
- resultados são reinjetados no prompt como `role=tool`;
- erros são convertidos em resultado de erro para o provider continuar;
- o loop limita a execução a cinco passagens;
- o V2 é agendado depois da persistência/outbound do V1 e não participa da
  resposta.

## 4. Estado operacional e multi-turno

### Conversa V1

`AssistantConversation` possui:

- `aiActive` e `pausedByHuman`;
- `currentContextVersion`;
- origem, canal, IDs externos de account/conversation/contact/inbox;
- status, timestamps e última mensagem;
- relação com sessões, mensagens e bookings.

`AssistantConversationMessage` possui `contextVersion`, IDs externos, role,
source, `externalPayload`, `mode` e relação com evento V2.

### Sessão e reset

`AssistantConversationSession` delimita `contextVersion`, status ACTIVE/CLOSED/
RESET, início/fim, motivo, mensagem de reset, resumo e estado de extração de
memória. O reset incrementa a versão e cria nova sessão sem apagar o histórico
anterior.

### V2

`ConversationState` contém:

- revisão monotônica;
- objetivo principal e objetivos secundários;
- fatos confirmados e temporários;
- campos pendentes;
- pergunta relevante;
- intenção, flow selecionado e estágio;
- última mensagem processada;
- status e expiração.

No PostgreSQL, `AssistantConversationStateV2` é único por empresa,
assistente, conversa, `contextVersion` e modo. Cada evento V2 possui
`internalMessageId` único, revisão resultante e status. Isso fornece
idempotência e isolamento para o Shadow.

### O que falta para a Fase 7

Não há no estado atual:

- ação pendente com ID estável;
- categoria da ação;
- versão/revisão que originou a proposta;
- parâmetros sanitizados ou hash dos parâmetros;
- confirmação vinculada à ação;
- expiração da confirmação;
- estado EXECUTING/SUCCEEDED/FAILED por ação;
- referência externa idempotente;
- política de compensação após efeito externo parcial.

Esses campos não devem ser adicionados nesta auditoria.

## 5. Autoridade de resultados de ferramenta

O contrato aprovado da Fase 6 deve ser aplicado também às ferramentas:

- `TOOL_RESULT` só pode autorizar as categorias declaradas pela ferramenta;
- resultado precisa de `companyId`, `assistantId` quando aplicável, instalação,
  recurso/conversa, `sourceId`, timestamp, validade, status e categoria;
- score/relevância não substitui autoridade;
- horário aberto não prova disponibilidade;
- disponibilidade não prova booking;
- booking só é confirmado após sucesso da ferramenta e persistência verificável;
- RAG, memória, histórico ou flow não simulam resultado de ferramenta;
- resultado expirado ou fora do escopo é rejeitado;
- resultado parcial deve ser marcado como parcial, nunca convertido em sucesso;
- falha de persistência depois de efeito externo deve gerar estado de
  reconciliação, não retry cego.

Precedência proposta por categoria:

| Categoria | Autoridade operacional mínima |
|---|---|
| `AVAILABILITY` | `TOOL_RESULT` atual de disponibilidade ou confirmação humana válida e escopada |
| `BOOKING` | sucesso atual de criação/alteração/cancelamento, com registro externo e local reconciliado |
| `PRICE` | ferramenta/catálogo explicitamente autorizado para preço; RAG não basta |
| `DEADLINE` | ferramenta ou fonte oficial vigente que declare prazo |
| `BUSINESS_HOURS` | contexto oficial estruturado; ferramenta de agenda não substitui o horário oficial |

## 6. Confirmação antes de efeitos

O V1 hoje calcula `requiresConfirmation` por configuração da ferramenta ou
por ser uma operação mutável. A confirmação é detectada por regex no texto da
mensagem atual, com expressões afirmativas genéricas. Ela não é vinculada a:

- uma ação proposta persistida;
- um hash de parâmetros;
- uma revisão da conversa;
- uma contextVersion;
- um prazo de expiração;
- um identificador de confirmação.

Isso deixa risco de uma resposta curta, como “sim”, confirmar uma ação antiga,
ambígua ou de outra versão de sessão. É um gap crítico antes de qualquer
execução V2.

Contrato recomendado para Fase 7:

```text
ACTION_PROPOSED
  → AWAITING_CUSTOMER_CONFIRMATION
  → ACTION_CONFIRMED
  → EXECUTING
  → SUCCEEDED | FAILED

Estados terminais adicionais:
  EXPIRED
  CANCELLED
```

O registro deve conter somente dados mínimos e sanitizados: `actionId`,
`companyId`, `assistantId`, `conversationId`, `contextVersion`,
`sourceMessageId`, `sourceRevision`, categoria, ferramenta, `argsHash`,
resumo seguro, `expiresAt`, confirmação vinculada e referência externa.

Uma confirmação só é válida se:

1. estiver na mesma empresa, assistente, conversa e contextVersion;
2. apontar para o `actionId` pendente;
3. estiver dentro de `expiresAt`;
4. não houver nova intenção incompatível;
5. a revisão/estado ainda estiver vigente;
6. os parâmetros atuais tiverem o mesmo hash;
7. a confirmação for explícita para a ação apresentada.

## 7. Chatwoot e handoff

### Ingresso

`ChatwootWebhookController` recebe `message_created`, resolve configuração
ativa por account/inbox, valida segredo, ignora mensagens privadas/outgoing,
resolve o assistente ativo e aplica deduplicação pelo ID externo.

`ChatwootWebhookService` pode agrupar mensagens em buffer por conversa antes de
chamar o runtime. O buffer é memória local do processo e combina mensagens após
o intervalo configurado. Isso deve ser considerado na definição de idempotência
e ordenação da Fase 7.

### Outbound e pausa

O V1 envia mensagens para o endpoint de mensagens do Chatwoot com metadata de
origem e pode atualizar `ai_active` via endpoint de conversa. Falhas de
outbound são registradas e não desfazem a persistência local da resposta.

O estado local registra `aiActive`, `pausedByHuman`, motivos e timestamps.
O webhook também ignora ingressos quando a IA está inativa ou há intervenção
humana.

### Handoff atual

O flow pode declarar `finalAction=handoff`, `requiresHuman`, time e labels. O
runtime V1, entretanto, apenas:

- limpa a triagem;
- marca `handoffPending` no metadata;
- pula o provider;
- produz resposta interna de transferência.

Não foi encontrado, nesse caminho, aplicação efetiva de `handoffTeamId`,
`handoffTeamName` ou `chatwootLabels` no Chatwoot. Também não há entidade
persistida de handoff nem estado de corrida que impeça explicitamente IA e
humano de agirem simultaneamente além de `aiActive`/`pausedByHuman`.

Contrato V2 inicial recomendado: `HANDOFF_REQUESTED` metadata-only, com escopo,
conversationVersion, motivo enumerado, time/label por IDs sanitizados e
`requiresHumanAction=true`. A primeira integração não deve chamar Chatwoot;
deve apenas produzir uma solicitação observável para o V1 ou operador aprovado.

## 8. Matriz de riscos

| Risco | Prevenção | Detecção | Recuperação | Evidência necessária |
|---|---|---|---|---|
| ferramenta duplicada | `actionId`/idempotency key por ação | mesma chave, revisão ou `internalMessageId` | retornar resultado existente ou reconciliar | hashes de ação, status, referência externa |
| booking duplicado | chave única por escopo e slot; lock/rechecagem | booking local + evento externo | reconciliação; não criar segundo evento | `idempotencyKey`, bookingId, eventId |
| confirmação reaproveitada | confirmação ligada a ação, revisão e contextVersion | mismatch de escopo/hash/expiração | invalidar e pedir nova confirmação | motivo enumerado |
| execução fora do tenant | validar empresa em toda leitura/escrita | `OUT_OF_SCOPE` | bloquear | scope failure |
| argumentos incompletos | JSON Schema + contrato tipado | validação antes do efeito | solicitar campo faltante | campos ausentes, sem payload livre |
| flow errado executa ferramenta | flow/allowedToolSlugs e categoria atual | incompatibilidade flow/tool | bloquear e registrar | flowId, tool category, reason |
| timeout após efeito externo | estado EXECUTING + reconciliação | timeout sem status final | consulta de reconciliação; não retry cego | external reference/status |
| sucesso externo sem persistência | transação/outbox ou reconciliação | evento sem registro local | reconciliar ou marcar UNKNOWN | correlation/action ID |
| retry após sucesso | idempotência antes de chamada | chave já concluída | devolver resultado existente | action status |
| resultado sensível | responseFilter/redaction por schema | scanner de campos proibidos | descartar/sanitizar | redaction counters |
| handoff e IA simultâneos | lock de `aiActive`/handoff state | mensagens concorrentes | pausar IA e reconciliar | transition events |
| tool result antigo | validade, observedAt e source revision | EXPIRED/STALE | SAFE_UNAVAILABLE ou nova consulta | freshness decision |
| reset durante execução | validar contextVersion antes/depois | mismatch de versão | cancelar lógica local e reconciliar efeito externo | reset/action linkage |

## 9. Gaps e decisões pendentes

### Gaps críticos

1. Confirmação V1 não está ligada a ação, parâmetros, revisão ou sessão.
2. Não há estado persistido de ação pendente/executando/concluída.
3. Google Calendar cria efeito externo antes de persistir o booking local; falha
   posterior pode deixar efeito externo sem registro local.
4. Custom webhook não possui idempotência por ação nem outbox/reconciliação.
5. Handoff configurado no flow não conclui, por si só, a transferência no
   Chatwoot.
6. O loop de provider pode solicitar múltiplas ferramentas em até cinco
   iterações; não existe limite por `actionId`/turno além do loop.
7. O V2 não possui ferramenta executável nem estado de ação, conforme desejado;
   qualquer futura execução exige isolamento adicional.
8. O buffer Chatwoot é local ao processo e pode complicar ordenação em
   múltiplas réplicas ou reinício.

### Decisões que precisam de aprovação

- se a Fase 7 começará somente como observação metadata-only de tool results;
- quais ferramentas podem ser consideradas read-only;
- se booking exige confirmação sempre, sem override permissivo;
- se haverá outbox/reconciliação antes de qualquer mutação V2;
- qual contrato de handoff será usado e se o V1 continuará sendo o executor;
- TTL de ação pendente e política de reset durante execução;
- estratégia para custom webhook sem suporte remoto a idempotência;
- se a execução inicial V2 será proibida por allowlist de ferramenta até a
  validação completa.

## 10. Arquitetura proposta para a Fase 7

A divisão recomendada, ajustável após aprovação, é:

### 7.1A — auditoria

Concluída neste documento. Nenhuma alteração de código ou banco.

### 7.1B — contratos canônicos de ação e ferramenta

Criar tipos versionados para `ToolCapability`, `ToolInvocationProposal`,
`ToolResultObservation`, `ActionIntent` e `HandoffRequest`, com escopo,
proveniência, validade, autoridade e redaction.

### 7.1C — estado de ação pendente

Definir persistência usando modelos existentes somente se possível; caso
contrário, aprovar migration antes de criar tabela. O mínimo deve suportar
`actionId`, status, hash de argumentos, revisão, contextVersion, expiração e
referência externa.

### 7.1D — observação metadata-only dos resultados V1

Observar apenas resultados de ferramentas já executadas pelo V1. Sem execução
V2, sem nova chamada externa e sem mudança de outbound.

### 7.1E — execução sintética no V2

Executar somente adapters fake/in-memory e fixtures. Validar escopo,
confirmação, idempotência, freshness, conflitos e reset.

### 7.1F — disponibilidade read-only

Avaliar integração controlada de disponibilidade. Primeiro exigir resultado
atual, escopado e metadata-only; não permitir booking.

### 7.1G — booking com confirmação

Somente após outbox/reconciliação, ação pendente persistida e testes de retry,
timeout, reset e sucesso parcial. Confirmação obrigatória e sem override por
flow nessa etapa.

### 7.1H — handoff Chatwoot

Implementar primeiro solicitação metadata-only e sincronização de `ai_active`/
estado humano. Aplicação de labels/assignment deve ter contrato próprio e
idempotência.

### 7.1I — validação Shadow

Ativar somente em `SHADOW_METADATA`, allowlist mínima, sem provider/tool/
outbound V2, com cenários de falha parcial e multi-tenant.

### 7.1J — ativação controlada

Só depois de aprovação de segurança, healthchecks, rollback operacional e
confirmação explícita do escopo de ferramentas permitidas.

## 11. Critérios para qualquer execução futura

Antes de uma ferramenta V2 poder ser chamada, devem existir:

- escopo completo e validado;
- capability configurada para empresa/assistente/flow;
- schema de argumentos e limites;
- action ID e idempotency key;
- política de confirmação;
- estado persistido e transições atômicas;
- timeout e reconciliação;
- redaction de resultado;
- bloqueio por contextVersion/reset;
- observabilidade sanitizada;
- kill switch e allowlist de ferramenta;
- testes sem provider real e sem outbound real.

## 12. Conclusão

O V1 possui capacidade operacional real para Google Calendar, custom webhook e
Chatwoot, mas a semântica de ação ainda está acoplada ao ciclo do provider.
O V2 está corretamente sem execução operacional. A maior barreira para a
Fase 7 não é descobrir novas ferramentas: é introduzir um contrato persistido
de ação, confirmação, idempotência e reconciliação sem alterar o outbound do
V1.

Nenhuma migration, configuração, frontend, banco, provider, ferramenta ou
outbound foi alterado nesta auditoria.

## 13. Fase 7.1B — contratos canônicos aprovados

A implementação pura está em `apps/api/src/runtime-v2/action-contracts.ts` e
é exportada pelo índice do Runtime V2. Ela não registra executor, não consulta
Prisma, não chama provider e não altera o caminho V1.

### Versionamento e identidade

O contrato inicial é `ACTION_CONTRACT_VERSION=1`. A identidade de uma ação é
derivada deterministicamente de empresa, assistente, conversa,
`contextVersion`, mensagem interna, tipo de ação e hash canônico dos
argumentos. A ordenação das chaves de objetos não altera o hash; a ordem de
arrays permanece semântica.

`idempotencyKey` é separado de `actionId` e usa a mesma identidade sem a
mensagem interna, permitindo proteger o efeito externo dentro da mesma
intenção/versão. `executionId` representa uma tentativa e pode mudar em um
retry sem criar nova ação.

### Contratos criados

- `ActionRequest`;
- `ActionConfirmation`;
- `ActionEvent`;
- `ToolExecutionRequest`;
- `ToolExecutionResult`;
- `FlowActionProposal`;
- `RuntimeV2ActionManifest`.

Os contratos carregam escopo, versão, validade, hash, política e proveniência,
mas não carregam credenciais, tokens, payload bruto, prompt ou conteúdo
integral de ferramenta.

### Taxonomia

Tipos de ação: disponibilidade, criação/alteração/cancelamento/listagem de
booking, webhook read/write e operações de handoff/assignment/label/status.

Categorias: `AVAILABILITY`, `BOOKING`, `EXTERNAL_LOOKUP`,
`EXTERNAL_MUTATION`, `HANDOFF` e `CONVERSATION_OPERATION`.

Efeitos: sem efeito externo, leitura externa, mutação externa reversível,
mutação externa irreversível e operação humana. O flow pode propor uma ação,
mas não define autoridade, confirmação ou sucesso.

### Confirmação e ciclo de vida

O ciclo puro rejeita transições inválidas e impede reexecução de estados
terminais:

```text
ACTION_PROPOSED
  → AWAITING_CUSTOMER_CONFIRMATION / AWAITING_HUMAN_CONFIRMATION
  → ACTION_CONFIRMED
  → EXECUTION_QUEUED
  → EXECUTING
  → SUCCEEDED | FAILED

EXECUTING + timeout
  → RECONCILIATION_REQUIRED
  → RECONCILED_SUCCEEDED | RECONCILED_FAILED
```

Uma confirmação válida exige `actionId`, escopo completo,
`contextVersion`, mensagem confirmadora, hash dos parâmetros, validade e ação
em estado de espera. Um “sim” sem ação pendente não é confirmação.

### Retry, reconciliação e autoridade

`RetryPolicy` distingue leitura segura, escrita idempotente, reconciliação antes
do retry e nunca retry. Timeout com possível efeito externo não autoriza nova
execução: produz `RECONCILIATION_REQUIRED`.

`toolResultToEvidence` converte somente resultado bem-sucedido, atual,
escopado, com proveniência e categoria declarada em `TOOL_RESULT`. O resultado
autoriza apenas as categorias declaradas; resultado expirado, falho, fora de
escopo ou com efeito desconhecido é rejeitado.

### Manifesto Shadow

O manifesto recebeu uma extensão opcional `action` com contrato, tipo,
categoria, efeito, status, confirmação, hashes, política de retry e erro. Os
marcadores permanecem obrigatoriamente:

- `toolExecutionPerformed=false`;
- `externalEffectMayHaveOccurred=false`;
- `actionRedactionApplied=true`.

Nesta subfase nenhum `ActionRequest` é criado pelo Shadow real e nenhum
executor é registrado.

### Testes e limitações

Os testes em `apps/api/test/runtime-v2-action-contracts.test.mjs` cobrem
determinismo, escopo, confirmação, estados terminais, timeout/reconciliação,
resultado de ferramenta, redaction, serialização e eventos.

Ainda não existe executor, outbox ou reconciliação real. Esses itens permanecem
nas subfases seguintes; nenhuma migration foi criada.

## 14. Fase 7.1C — estado persistente e seguro de ação pendente

O estado pendente foi incorporado opcionalmente a `ConversationState` como
`actionState`, dentro do mesmo `stateJson` já persistido por
`PrismaConversationStateStore`. Nenhuma tabela nova ou migration é necessária.

### RuntimeActionState e redaction

`RuntimeActionState` contém apenas `activeAction`, referências de ações
terminais recentes, `lastActionEventId`, `updatedAt` e um histórico limitado de
eventos sanitizados. `PendingActionState` preserva chaves de parâmetros,
hashes, escopo, validade, status, confirmação e proveniência; não preserva
`normalizedArguments` nem texto livre. A lista de ações terminais fica limitada
a 10 referências e os eventos recentes a 32.

O serializador do estado aplica redaction por schema antes de produzir JSON.
Argumentos, payloads, prompts, mensagens, tokens, credenciais, telefone,
e-mail e valores livres não entram no estado nem nos eventos persistidos.

### Reducer e confirmação

`reduceRuntimeActionState` é puro, determinístico e valida escopo,
`contextVersion`, ordem temporal, idempotência de evento e transições do
contrato 7.1B. Estados terminais não retornam à execução. Propostas são
criadas por `proposePendingAction`; confirmações passam por
`StructuredConfirmationSignal` e geram `ActionConfirmation` somente quando há
ação pendente, hash e escopo compatíveis. Rejeição, expiração, reset, troca de
intenção e takeover humano terminalizam a referência anterior.

### Persistência e concorrência

Quando habilitado, o estado de ação acompanha a mesma transação `saveTurn` que
persiste o estado de conversa e o evento de turno. O controle de revisão
existente continua sendo a autoridade de concorrência; retry de mensagem
duplicada não cria novo evento de ação. Restart recarrega o `actionState` do
PostgreSQL. Redis não é fonte canônica.

### Feature flag e limites operacionais

`RUNTIME_V2_ACTION_STATE_MODE` aceita `OFF` ou `SHADOW_STATE` e permanece `OFF`
por padrão. Em `OFF`, nenhum estado ou evento de ação é criado. Em
`SHADOW_STATE`, propostas e confirmações atualizam somente o estado V2 e o
manifesto; `toolExecutionPerformed`, `providerCalled`, `toolCalls` e
`outboundSent` permanecem desativados.

O manifesto registra status, hashes, revisão, compatibilidade, IDs de eventos,
expiração e decisão de confirmação sem parâmetros ou conteúdo integral. Os
testes unitários, Shadow local e PostgreSQL cobrem restart, idempotência,
expiração, reset, escopo e confirmação. Execução de ferramentas, outbox,
reconciliação externa e handoff permanecem fora desta subfase.

### Plano da Fase 7.1D

1. observar propostas e resultados de ferramentas V1 como metadata-only;
2. validar `TOOL_RESULT` no resolvedor da Fase 6 sem executar pelo V2;
3. testar reconciliação sintética e timeout sem efeitos externos;
4. somente depois avaliar integração operacional de leitura, confirmação e
   handoff, cada uma com flag e rollback próprios.
