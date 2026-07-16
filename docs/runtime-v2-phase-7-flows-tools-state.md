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

- Google Calendar: capability operacional no V1, mas opcional por empresa/app;
- custom webhook: operacional no V1, com efeitos externos conforme método;
- Chatwoot outbound/`ai_active`: operacional no V1, fora do V2;
- handoff: parcial;
- execução de ferramentas pelo V2: inexistente por desenho;
- adapters fake do V2: apenas testes, sem conexão operacional.

### Escopo por empresa e app

Google Calendar não é requisito global do Runtime V2. A capability somente pode
ser considerada disponível quando a empresa possuir a instalação ativa, a
credencial OAuth descriptografável, o recurso/calendário configurado e o flow
permitir explicitamente a operação read-only correspondente.

A preparação operacional para a FG foi cancelada deliberadamente: não devem
ser criados credencial, recurso, flow ou configuração artificial de agenda para
essa empresa. A configuração e a validação real do APP Google Calendar ficam
adiadas para a implantação do APP da Drimo.

Ausência de OAuth ou de recurso Google Calendar na FG não bloqueia o núcleo do
Runtime V2. Adapters reais devem ser habilitados por empresa/app, nunca como
dependência global. Quando o app não estiver instalado/configurado, Google
Calendar permanece proibido por padrão e nenhuma ferramenta correspondente é
exposta ou executada.

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

### 7.1G — contratos e estado de handoff Chatwoot

Definir contrato genérico de handoff, independente de Google Calendar, com
escopo por empresa, assistente, conversa e `contextVersion`. O estado deve
separar proposta, confirmação, execução, conclusão, cancelamento e intervenção
humana, sem persistir mensagens ou payloads integrais.

### 7.1H — execução controlada de handoff

Executar somente a operação Chatwoot aprovada e escopada, com idempotência,
kill switch, reconciliação de `aiActive` e prevenção de concorrência entre IA e
humano. Nenhuma dependência de agenda ou outro app deve ser introduzida.

### 7.1I — validação Shadow

Ativar somente em `SHADOW_METADATA`, allowlist mínima, sem provider/tool/
outbound V2, com cenários de falha parcial e multi-tenant.

### 7.1J — ativação controlada

Só depois de aprovação de segurança, healthchecks, rollback operacional e
confirmação explícita do escopo de ferramentas permitidas.

### Plano revisado após a decisão de escopo

1. **7.1G — Handoff Chatwoot:** contratos canônicos, estado pendente,
   confirmação, escopo e idempotência genéricos para todos os clientes.
2. **7.1H — Execução controlada:** integração mínima e reversível do handoff,
   sem Google Calendar e sem ativação ampla de ferramentas.
3. **7.1I — Validação Shadow:** observar propostas, transições e resultados
   metadata-only, mantendo provider, ferramenta e outbound V2 desligados.
4. **7.1J — Ativação controlada:** allowlist mínima, rollout gradual,
   healthchecks e rollback explícito.
5. **Trilha futura de APP:** configurar e validar Google Calendar somente para
   a Drimo, como capability opcional e independente do núcleo do Runtime V2.

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
Chatwoot, mas a semântica de ação ainda está acoplada ao ciclo do provider. O
Google Calendar é uma capability opcional por empresa/app e não um requisito do
núcleo do Runtime V2; sua ausência na FG foi aceita e a integração foi adiada
para a implantação do APP da Drimo.
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

## 15. Fase 7.1D — observação metadata-only das ferramentas V1

### Ponto de execução auditado

O caminho operacional V1 converge em
`AssistantConversationsService.executeTool`. A validação de escopo, permissão
do flow, configuração por assistente, execução de Calendar/Webhook e registro
de `tool_call_requested`, `tool_call_completed` e `tool_call_failed` permanecem
inalterados. A observação lateral é criada após o resultado, usando o instante
capturado imediatamente antes da tentativa e sem repetir a chamada.

Os caminhos Calendar observados são disponibilidade, criação, listagem,
remarcação e cancelamento. Custom Webhook é classificado por método HTTP:
`GET`/`HEAD` como leitura e demais métodos como mutação. Outbound normal do
V1, labels, assignment e handoff proposto não são convertidos automaticamente
em observação de ferramenta.

### Contrato e mapeamento

`V1ToolExecutionObservation` é versionado, determinístico e metadata-only.
Preserva escopo, turno, flow, ferramenta, operação, tipo de ação, efeito,
chaves e hash dos argumentos, duração, timeout, status, validade, hashes de
resultado/referência, retry, duplicidade, reconciliação e códigos enumerados.
Argumentos, payloads, URLs, headers, respostas, mensagens e credenciais não
são persistidos.

`SUCCEEDED`, `FAILED`, `REJECTED`, `DUPLICATE_SUPPRESSED` e
`TIMED_OUT_UNKNOWN_EFFECT` são mapeados para `ToolExecutionResult`. Timeout de
mutação marca `externalEffectMayHaveOccurred=true` e
`RECONCILIATION_REQUIRED`; não produz evidência factual positiva. O conversor
`toolObservationToEvidence` reutiliza `toolResultToEvidence` e só permite as
categorias declaradas pela própria operação.

### Shadow, correlação e persistência

`RUNTIME_V2_TOOL_OBSERVATION_MODE` aceita `OFF` ou `SHADOW_METADATA` e fica
`OFF` por padrão. A observação só entra no Shadow com `MODE=SHADOW`, assistente
allowlisted e flag ativa. O manifesto e o log Runtime V2 registram a
observação sanitizada; a persistência usa o mecanismo de logs/eventos já
existente e não cria tabela ou migration.

Quando há `SHADOW_STATE`, a correlação compara escopo, `contextVersion`, tipo,
categoria e `argumentsHash`. O resultado é somente `MATCHED`,
`NO_ACTIVE_ACTION` ou motivo de incompatibilidade; a observação não altera o
estado da ação nem o status de execução.

### Fail-safe e limites

Falha da observação não bloqueia o V1, não executa retry, não altera argumentos
ou resposta e não produz outbound. A flag `OFF` não cria snapshot nem evento.
O V2 continua com `providerCalled=false`, `toolCalls=0`,
`outboundSent=false` e sem executor registrado. A reconciliação real,
idempotência externa e execução operacional ficam para a Fase 7.1E.

### Validação

Os testes de `runtime-v2-tool-observation.test.mjs` cobrem identidade,
redaction, Calendar, Webhook read/write, timeout, efeito incerto, conversão em
evidência, allowlist e Shadow sem execução. Os testes V1 existentes de Calendar,
Custom Webhook, Chatwoot e escopo de flow permanecem regressões; nenhum provider
ou endpoint externo é chamado pelos testes novos.

## 16. Fase 7.1E — execução sintética sem efeitos externos

### Flag e isolamento

`RUNTIME_V2_SYNTHETIC_EXECUTION_MODE` aceita `OFF` ou `SYNTHETIC_ONLY` e fica
`OFF` por padrão. A execução só é elegível quando Runtime V2 está em `SHADOW`,
`RUNTIME_V2_ACTION_STATE_MODE=SHADOW_STATE`, o assistente está allowlisted e a
flag sintética está em `SYNTHETIC_ONLY`.

O `SyntheticToolRegistry` aceita exclusivamente nomes com prefixo
`synthetic.`. O registro padrão contém `synthetic.availability`,
`synthetic.booking`, `synthetic.webhook_read` e `synthetic.webhook_write`.
Nenhum service Calendar, Webhook, Chatwoot, cliente HTTP ou provider é
importado ou injetado pelo módulo sintético.

### Ciclo, estado e fila

`RuntimeV2SyntheticExecutionOrchestrator` usa o `ConversationStateStore` já
existente. A transição é `ACTION_CONFIRMED` ou ação de leitura sem confirmação
→ `EXECUTION_QUEUED` → `EXECUTING` → resultado terminal. Timeout de mutação
produz `RECONCILIATION_REQUIRED`; não há retry automático.

O `executionId` é determinístico por ação, ferramenta, versão, hash dos
argumentos, tentativa e `contextVersion`. O estado e os eventos sanitizados
são gravados no mesmo `stateJson`, com revisão otimista; não há worker, Redis,
outbox, tabela ou migration nova. Concorrência vencida retorna conflito
explícito. Ações terminais são suprimidas sem segunda execução.

### Resultados e evidências

Os adapters falsos usam fixtures tipadas e marcam sempre
`executionEnvironment=SYNTHETIC` e `sourceVersion=SYNTHETIC_RUNTIME_V2`.
Availability autoriza somente `AVAILABILITY`, booking somente `BOOKING` e
webhook somente sua categoria declarada. Falha, timeout incerto e duplicidade
não geram evidência positiva. Reconciliação sintética pode produzir
`RECONCILED_SUCCEEDED`, `RECONCILED_FAILED` ou permanecer pendente.

O manifesto registra somente hashes, enums, contagens, status, revisões,
validade e duração. Mantém `realToolExecutionPerformed=false`,
`externalNetworkCallPerformed=false`, `providerCalled=false` e
`outboundSent=false`. A execução sintética não cria
`V1ToolExecutionObservation`.

### Validação PostgreSQL local e limitação ambiental

Os testes unitários cobrem flag, allowlist, registry, disponibilidade, booking,
webhook, confirmação, falha, timeout, reconciliação, duplicidade,
cancelamento, concorrência, determinismo e bloqueio de imports reais. O banco
primário local não continha as tabelas Runtime V2, embora o schema Prisma e a
migration versionada estivessem presentes. A validação foi concluída em banco
local descartável, usando somente `prisma migrate deploy` e a migration
`20260713164733_add_runtime_v2_persistence`; nenhuma migration nova, `db push`
ou alteração do banco operacional foi necessária.

O banco migrado foi validado com state, eventos, logs, revision,
`contextVersion`, `stateJson`, índices, constraints e histórico de migrations.
Os testes PostgreSQL de persistência, concorrência, restart, idempotência,
isolamento, HTTP e evidência oficial passaram três vezes. A suíte não-DB passou
433/433 em cada uma de três execuções. A sanitização de estado preserva IDs e
hashes canônicos para impedir que a redaction de padrões numéricos altere a
identidade de uma ação após restart.

### Plano da Fase 7.1F

1. validar leitura de disponibilidade real em Shadow, ainda sem outbound;
2. comparar `TOOL_RESULT` real V1 com resultado sintético;
3. preparar confirmação e booking operacional apenas após reconciliação,
   rollback e isolamento aprovados.

## 17. Fase 7.1G — estado persistente de handoff Chatwoot

### Decisão de escopo

Google Calendar permanece uma capability opcional por empresa/app. A
integração operacional foi adiada para a implantação do APP da Drimo. A
ausência de OAuth ou recurso de calendário na FG não bloqueia o núcleo do
Runtime V2; nenhuma credencial, recurso ou flow de agenda foi criado para ela.
Adapters reais só poderão ser habilitados por empresa/app após configuração,
escopo e validação próprios. Google Calendar continua proibido por padrão
quando não estiver instalado e configurado.

### Contratos e motivos

`HandoffRequest` é um contrato versionado, metadata-only, vinculado a empresa,
assistente, conversa, contato, `contextVersion`, mensagem de origem, motivo,
urgência, destino e hashes de contexto/idempotência. Os motivos são enums como
`CUSTOMER_REQUESTED_HUMAN`, `LOW_CONFIDENCE`, `AUTHORITY_CONFLICT`,
`TOOL_FAILED`, `FLOW_REQUIRED_HANDOFF` e `HUMAN_ALREADY_ACTIVE`; o manifesto
não carrega texto livre. Destinos são `ANY_HUMAN`, `TEAM`, `AGENT`,
`SPECIALIZED_QUEUE` e `EXISTING_ASSIGNEE`, sempre metadata-only.

O ciclo de vida inclui `HANDOFF_PROPOSED`, `HANDOFF_READY`, estados de
execução futuros e os terminais `HANDOFF_CANCELLED`, `HANDOFF_EXPIRED` e
`HANDOFF_SUPERSEDED`. Nesta fase, somente proposta, prontidão e invalidação
são alcançáveis. Nenhum estado Chatwoot operacional é alterado.

### Estado, escopo e idempotência

`RuntimeHandoffState` vive no `stateJson` de Runtime V2 junto do estado de
ação, sem tabela ou migration nova. Há no máximo um handoff ativo por
empresa/assistente/conversa/`contextVersion`; referências terminais ficam
limitadas a dez. `handoffId`, `observationId` e eventos são determinísticos,
com hashes estáveis; os últimos eventos metadata-only ficam limitados a 32 e
mensagens duplicadas não criam propostas adicionais.
Revisão otimista, isolamento de escopo e recuperação após restart reutilizam o
repositório PostgreSQL existente. Redis não é fonte canônica.

### Observação V1 e correlação

`V1HandoffObservation` captura somente `handoffPending`, pedido estruturado de
humano, atividade humana, `aiActive` e `pausedByHuman`, além de chaves,
categorias, hashes e proveniência. A observação não pausa/ativa IA, não chama
Chatwoot e não envia mensagem. Quando houver `CHATWOOT_HANDOFF` no Action State,
a correlação exige o mesmo escopo, contexto, ação e turno; ela não transiciona
automaticamente a ação para execução.

### Feature flag, manifesto e fail-safe

`RUNTIME_V2_HANDOFF_STATE_MODE` aceita `OFF` ou `SHADOW_STATE` e permanece
`OFF` por padrão. Com `OFF`, não há observação, proposta, evento ou alteração
de estado. Com `SHADOW_STATE`, somente metadata sanitizada é persistida. O
manifesto registra presença, status, motivo, destino, compatibilidade,
revisões, IDs de eventos e hashes, mantendo `handoffExecutionPerformed=false`,
`chatwootMutationPerformed=false`, `labelApplied=false`,
`assignmentChanged=false`, `conversationStatusChanged=false`,
`aiActiveChanged=false` e `outboundSent=false`.

Falha de redaction, escopo, revisão ou persistência é sanitizada, não bloqueia
o V1 e não dispara retry infinito. Intervenção humana, reset e mudança de
`contextVersion` invalidam proposta antiga de forma determinística.

### Validação e limitações

Os contratos puros, reducer, observação V1, correlação, redaction,
concorrência, persistência PostgreSQL descartável e Shadow local devem provar
idempotência e isolamento sem qualquer operação Chatwoot. A execução futura,
pausa/ativação de IA, labels, assignment, status, equipe/agente, confirmação
operacional e reconciliação ficam explicitamente fora desta fase.

### Plano da Fase 7.1H

1. definir o adapter e o contrato de execução Chatwoot sem registrar executor
   no Runtime V2;
2. validar confirmação, escopo, idempotência e reconciliação em fixtures;
3. observar sinais reais do V1 sem mutação V2;
4. executar handoff controlado somente após Shadow, rollback e isolamento
   aprovados, com flags independentes e sem dependência de Google Calendar.

## 18. Fase 7.1H-A — executor controlado de handoff Chatwoot

### Auditoria do caminho existente

O V1 já possui `setExternalConversationAiActive`, que resolve a configuração
ativa por empresa, account e inbox, envia a alteração `ai_active` ao Chatwoot
e atualiza o rastreamento local quando a resposta é bem-sucedida. O caminho de
outbound (`sendChatwootOutboundText`) é separado e não é usado pelo executor.
`ChatwootInboxConfigService.resolveActiveForConversation` é o ponto de
resolução de configuração e descriptografia, mas não é importado pelo executor
controlado. Webhooks continuam sendo entrada/observação do V1; labels,
assignment e status não são executados nesta subfase real.

### Contrato e elegibilidade

`ChatwootHandoffExecutionPlan` é versionado e metadata-only. Ele contém
`executionId`, `handoffId`, escopo, `contextVersion`, motivo, destino, passos,
idempotency key, preconditions e validade. Os passos possíveis são
`VERIFY_CONVERSATION`, `VERIFY_AI_ACTIVE`, `PAUSE_AI`, `APPLY_LABEL`,
`ASSIGN_TEAM`, `ASSIGN_AGENT` e `VERIFY_FINAL_STATE`. Payloads, tokens, URLs,
mensagens, nomes e credenciais nunca fazem parte do plano.

`RUNTIME_V2_HANDOFF_EXECUTION_MODE` aceita `OFF` ou `CONTROLLED` e o default é
`OFF`. As allowlists independentes
`RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS` e
`RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS` são vazias por padrão. A
execução só é elegível com Runtime V2 `SHADOW`, Handoff State
`SHADOW_STATE`, modo `CONTROLLED`, ambas as allowlists, handoff
`HANDOFF_READY`, escopo íntegro, configuração/inbox válidos e motivo permitido.
Inicialmente, somente `CUSTOMER_REQUESTED_HUMAN`, `FLOW_REQUIRED_HANDOFF` e
`MANUAL_OPERATOR_REQUEST` podem executar automaticamente.

### Adapter, ordem e resultados

`ChatwootHandoffAdapter` é uma interface isolada com leitura de estado,
pausa de IA, label, assignment, verificação final e reconciliação. O executor
não importa services Chatwoot, Calendar, Webhook, clientes HTTP ou providers;
os testes usam somente adapter fake determinístico. O adapter real permanece
uma integração futura, bloqueada quando o modo está `OFF`.

A ordem é: validar escopo/configuração, ler conversa, verificar humano e IA,
pausar IA, aplicar configurações opcionais, atribuir equipe/agente e verificar
o estado final. `ANY_HUMAN` pausa somente a IA, salvo label explicitamente
configurada; `TEAM` e `AGENT` exigem destino hashado e assignment configurado;
`EXISTING_ASSIGNEE` preserva o responsável atual. Nenhuma mensagem pública ou
privada é enviada.

O resultado canônico distingue `SUCCEEDED`, `ALREADY_COMPLETED`, falha antes
da mutação, falha após mutação parcial, `TIMED_OUT_UNKNOWN_EFFECT`, estados de
reconciliação, `REJECTED`, `CANCELLED` e `HUMAN_ALREADY_ACTIVE`. Timeout após
envio marca efeito potencialmente ocorrido e exige reconciliação; nunca há
reativação automática da IA. Pausa já confirmada e assignment já correto são
tratados idempotentemente.

### Estado, correlação e manifesto

Os eventos de execução permitidos no reducer são
`HANDOFF_EXECUTION_PENDING`, `HANDOFF_EXECUTION_STARTED`,
`HANDOFF_EXECUTION_SUCCEEDED`, `HANDOFF_EXECUTION_FAILED`,
`HANDOFF_EXECUTION_TIMED_OUT` e eventos de reconciliação. Estados terminais
não retornam à execução. A correlação com Action State continua sendo apenas
referência; não há duas fontes canônicas nem transição automática de ação por
este executor.

O manifesto registra modo, elegibilidade, allowlists, preconditions, passos
tentados/confirmados, estado de IA, mutação parcial, efeito incerto,
reconciliação, duração/resultado e redaction. Mantém sempre
`providerCalled=false` e `outboundSent=false`; não registra payload ou
identificadores externos integrais.

### Validação e limites

Os testes de `runtime-v2-handoff-executor.test.mjs` cobrem modo desligado,
allowlists, motivos, escopo, configuração, `ANY_HUMAN`, TEAM, AGENT,
`EXISTING_ASSIGNEE`, humano já ativo, pausa idempotente, falha parcial,
timeout, reconciliação, determinismo, transições e bloqueio arquitetural de
dependências reais. Esta subfase não habilita flags, não registra adapter real,
não acessa Chatwoot e não cria migration. A persistência operacional e o
controle de revisão serão ligados ao orquestrador Shadow somente após a
validação específica de 7.1H-B/7.1I.
