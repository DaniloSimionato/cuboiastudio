# Runtime V2 — Fase 8.1: respostas candidatas em Shadow

## Objetivo e escopo

O Runtime V2 pode produzir uma resposta textual candidata para comparação interna.
O V1 continua sendo a única origem de resposta ao cliente. A Fase 8.1 não possui
nenhum caminho de outbound, nem executa ferramentas, handoff, Chatwoot, mudança de
`ai_active`, labels, assignment ou status.

## Habilitação

Tudo começa desligado:

- `RUNTIME_V2_MODE=OFF`
- `RUNTIME_V2_SHADOW_ASSISTANT_IDS=`
- `RUNTIME_V2_SHADOW_CONVERSATION_IDS=`
- `RUNTIME_V2_RESPONSE_GENERATION_MODE=OFF`
- `RUNTIME_V2_RESPONSE_COMPARISON_MODE=OFF`
- `RUNTIME_V2_RESPONSE_ASSISTANT_IDS=`
- `RUNTIME_V2_RESPONSE_CONVERSATION_IDS=`

Todo turno V2 passa primeiro pelo `RuntimeV2ScopeGate`
(`runtime-v2-scope-gate-v1`), antes de carregar/criar `ConversationState`,
entender o turno, consultar RAG ou memória, registrar evento/log ou chamar o
provider. O gate é puro, versionado e default-deny: exige company, assistant e
conversation internos válidos, `RUNTIME_V2_MODE=SHADOW`, o assistente em
`RUNTIME_V2_SHADOW_ASSISTANT_IDS` e a conversa exata em
`RUNTIME_V2_SHADOW_CONVERSATION_IDS`. Uma allowlist ausente ou vazia bloqueia.
Não há wildcard, fallback de assistente para todas as suas conversas, nem uso da
referência externa como substituta do `conversationId` interno.

Uma candidata somente é elegível depois desse gate base, quando geração está em
`SHADOW` e as allowlists de assistente e conversa da resposta também contêm o
escopo exato. A allowlist de resposta é adicional: nunca substitui a allowlist
base de Shadow. Comparação só é persistida quando seu modo também está em
`SHADOW`. Não há reprocessamento de mensagens já registradas.

O mesmo gate base é aplicado ao worker Shadow, Evidence, Action State, Tool
Observation, Synthetic Execution, Handoff State/Execution e Response
Generation/Comparison. Cada feature mantém bloqueios complementares, mas nenhuma
pode iniciar processamento fora do escopo base.

### Incidente e contenção de escopo

Antes desse gate, uma execução Shadow allowlisted somente por assistente podia
criar estado/evento de telemetria para outra conversa do mesmo assistente, antes
de a allowlist de resposta bloquear a candidata. Esse registro histórico deve
ser preservado somente como evidência com a classificação
`NON_ALLOWLISTED_SHADOW_STATE_CREATED_BEFORE_SCOPE_GATE_FIX`; ele não é removido
nem reescrito por esta correção. Após o gate, uma conversa fora do escopo retorna
silenciosamente sem state, evento, Runtime log, RAG, memória, provider,
candidata, comparação, outbound, handoff ou ferramenta.

## Contexto e geração

Depois de o V1 concluir seu turno, ele fornece ao worker Shadow um contexto
efêmero já resolvido pelos serviços oficiais: comportamento/persona, regras de
segurança, flow selecionado e candidatos, dados oficiais, RAG selecionado,
memória autorizada e histórico recente. Esse contexto não é gravado em `stateJson`
nem em logs V2.

`RuntimeV2CandidateResponseGenerator` recompila o prompt com o
`PromptCompilerService`, sem contexto de calendário ou ferramentas, e usa a
abstração oficial `AiService` através de um adapter específico. Há no máximo uma
chamada de provider por `generationId`; testes usam somente provider fake. O
provider nunca é resolvido quando os bloqueios ou flags impedem a geração.

### Despacho assíncrono e timeout da geração

O caminho que o V1 observa termina no despacho, não na geração. Há dois budgets
distintos, ambos com fallback seguro quando a configuração está ausente ou é
inválida:

- `RUNTIME_V2_SHADOW_DISPATCH_BUDGET_MS` (padrão `250` ms): orçamento apenas
  para validar o escopo, deduplicar e agendar o trabalho Shadow. A chamada do
  V1 recebe controle de volta sem aguardar provider, quality gate, comparação
  ou persistência final;
- `RUNTIME_V2_CANDIDATE_GENERATION_TIMEOUT_MS` (padrão `10000` ms): timeout
  real do ciclo de provider, quality gate, comparação e persistência. É limitado
  a uma faixa finita e não pode produzir espera infinita.

O `RuntimeV2ShadowIntegrationService` grava telemetria de despacho com
`dispatchStatus=ACCEPTED`, `generationStatus=GENERATION_PENDING` e
`v1WaitReleased=true`. A conclusão atualiza a mesma linha de Runtime log: não
fica um `TIMEOUT` terminal coexistindo com uma candidata aprovada. O lifecycle
versionado da candidata é um entre `NOT_STARTED`, `DISPATCHED`,
`GENERATION_PENDING`, `GENERATION_COMPLETED`, `GENERATION_BLOCKED`,
`GENERATION_FAILED`, `GENERATION_TIMED_OUT` ou `GENERATION_CANCELLED`.

O timeout de despacho **não** é timeout do provider. Assim, uma geração que
ultrapassa 250 ms e conclui antes do timeout de geração permanece válida, com
`completedAfterV1Response=true` e exatamente uma chamada de provider. Quando o
timeout real vence, o adapter recebe `AbortSignal` quando suportado; qualquer
resultado tardio é descartado pelo lifecycle guard, não substitui o estado
terminal e não gera outbound.

Uma API reiniciada entre `GENERATION_PENDING` e a conclusão não reinicia o
trabalho nem reprocessa mensagens antigas. O registro pendente requer
reconciliação operacional (`INTERRUPTED_BEFORE_COMPLETION`), nunca aprovação por
inferência. A deduplicação por `generationId` e `internalMessageId` impede uma
segunda chamada concorrente ou replay após conclusão.

## Inbound canônico e comparação V1×V2

O turno é ancorado no snapshot textual recebido pelo webhook, não numa releitura
posterior da API Chatwoot. `CanonicalInboundMessage`
(`canonical-inbound-message-v1`) separa três representações:

- `displayContent`: conteúdo autorizado entregue ao V1 e ao snapshot efêmero do
  V2; para texto simples é o texto do cliente e, para mídia, pode incorporar
  somente a interpretação autorizada da própria mídia;
- `canonicalComparisonContent`: representação usada exclusivamente para
  correspondência e idempotência;
- telemetria redigida: hashes, versão de normalização e metadados estruturais;
  nunca uma cópia adicional do conteúdo, prompt ou dados pessoais.

`normalizeInboundMessageForComparison()` usa NFC, converte CRLF/CR em LF,
normaliza espaço não separável e remove somente caracteres zero-width que não
alteram a apresentação. Ela preserva caixa, acentos, palavras, pontuação,
emojis (incluindo ZWJ e variation selectors) e quebras de linha relevantes. O
hash de `currentMessage` em manifestos V1/V2 usa a mesma normalização.

Metadados de remetente, contato da conversa e localização de nível raiz do
payload Chatwoot não são conteúdo da mensagem. Um contato ou localização só
entra no input quando vier explicitamente do objeto da mensagem. Assim, uma
identidade de Chatwoot não é indevidamente interpretada como dado compartilhado
pelo cliente.

Quando Chatwoot expuser datas de atualização, a telemetria registra se a
mensagem foi editada após o recebimento. Uma edição não sobrescreve o snapshot
processado: a comparação mantém as versões apenas por hashes/metadados e uma
nova mensagem deve ser usada antes de qualquer novo Shadow se houver divergência
semântica.

## Contratos e persistência

`RuntimeV2CandidateResponse` (`runtime-v2-candidate-response-v1`) contém apenas
escopo, identidades determinísticas (`responsePlanId`, `generationId`), status,
texto redigido limitado a 1200 caracteres, provider/model, métricas, referências
de flow/evidência/memória e decisões de qualidade. `outboundAttempted` e
`outboundPerformed` são sempre `false`.

`RuntimeResponseComparison` (`runtime-v2-response-comparison-v1`) guarda somente
metadados de concordância V1×V2 e riscos, nunca o texto V1. Os dois históricos
ficam no `ConversationState.stateJson`, são deduplicados por `generationId` e
mantêm no máximo oito entradas recentes. A serialização existente remove tokens,
segredos, telefones e e-mails; prompt, memória e documentos integrais não são
persistidos. Nenhuma migration é necessária.

## Quality gate

Antes do provider, o candidato é bloqueado se precisar de handoff, tiver tool plan,
faltar autoridade factual, existir conflito de evidência ou a pergunta não puder
ser respondida com as fontes autorizadas. Depois da geração, o gate bloqueia texto
vazio, JSON/estrutura interna, alegação de ferramenta não executada, claims não
suportadas, pergunta repetida e excesso de tamanho.

Os resultados são `CANDIDATE_APPROVED`, `CANDIDATE_BLOCKED`,
`CANDIDATE_REQUIRES_HANDOFF` ou `CANDIDATE_GENERATION_FAILED`. Mesmo o estado
aprovado permanece exclusivamente em Shadow.

## Autoridade factual para horário comercial

Uma chave oficial disponível não é, por si só, uma autorização de resposta. Para
cada categoria factual, a telemetria separa a disponibilidade da aplicabilidade
e da decisão final: `authorityDecisionStatus`, categorias autorizadas,
categorias indisponíveis, tipos de fonte vencedores e identificadores redigidos
de evidência. Assim, `business_hours` só pode gerar uma resposta quando a
evidência estruturada oficial passa escopo, frescor e política e se torna a
autoridade vencedora `OFFICIAL_STRUCTURED_DATA`.

O bridge entre Evidence V2 e `ResponsePlan` preserva essa decisão na fronteira
assíncrona: `BUSINESS_HOURS` é convertido para a categoria de plano
`businessHours`, e `OFFICIAL_STRUCTURED`/`OFFICIAL_DOCUMENT` para
`OFFICIAL_CONTEXT`. A conversão carrega somente categoria, chave, tipo de fonte
e identificadores redigidos; não duplica o valor do horário em `stateJson` ou
telemetria.

Com Response Generation em Shadow e Evidence Mode desligado, o runtime faz
somente a leitura local, metadata-only, de evidência oficial necessária à
categoria solicitada. RAG, memória, customer/session evidence, ferramentas e
suas observações continuam desligados. Sem evidência oficial aplicável, ou com
evidência incompleta/conflitante, o plano permanece `SAFE_UNAVAILABLE`, a
candidata fica bloqueada e o provider não é chamado.

Perguntas diretas sobre horário, dias úteis, sábado, abertura, fechamento e
intervalo de almoço são classificadas como `BUSINESS_HOURS`. Follow-ups curtos,
como “E durante a semana?”, só herdam essa categoria quando até seis mensagens
recentes e autorizadas da mesma conversa indicam horário comercial. Sem esse
antecedente, o plano pede esclarecimento seguro; ele não infere agenda
individual, prazo de serviço, entrega específica ou visita não confirmada.

Essa regra corrige o incidente em que `business_hours` aparecia entre as chaves
disponíveis, mas não chegava como autoridade selecionada ao `ResponsePlan`.
Ela não altera o lifecycle assíncrono: o despacho continua curto, o V1 não
aguarda a geração, e uma conclusão posterior atualiza o mesmo `generationId`.

### Follow-up implícito e default deny factual

Follow-ups elípticos, como “E nos outros dias?”, são resolvidos antes do
`ResponsePlan` por regras determinísticas. O resolvedor observa no máximo seis
mensagens cronológicas da mesma conversa e produz somente metadata redigida:
detecção, status (`RESOLVED`, `AMBIGUOUS` ou `REJECTED`), tópico/categoria
herdados, fingerprint da mensagem antecedente, confiança e motivo. Ele não usa
memória global, resumos, outra conversa ou outro tenant.

O tópico é herdado apenas quando não há mudança explícita de assunto nem tópicos
recentes concorrentes. Em ambiguidade, o plano exige esclarecimento e não chama
o provider para formular um fato. Da mesma forma, `general_request` sem
classificação não-factual explícita não pode usar o amplo contexto oficial como
atalho para afirmar horário, preço, prazo, endereço, serviço ou agenda: o plano
fica `SAFE_UNAVAILABLE` até que uma autoridade seja selecionada antes da geração.

## Limites e rollback

O rollout deve começar com uma única conversa explicitamente allowlisted e manter
V1 como único outbound. Desligar os dois modos e limpar as allowlists interrompe
novas gerações sem alterar candidatos já persistidos. Uma fase posterior deve
validar comparações reais antes de qualquer decisão sobre resposta V2 ao cliente.

## Execução single-use controlada (executor primário restrito)

O repositório contém contratos preparatórios para uma futura execução single-use
de resposta Runtime V2: modo `RUNTIME_V2_RESPONSE_EXECUTION_MODE` default-deny,
allowlists específicas, aprovação vinculada ao hash canônico com validade máxima
de dez minutos e um coordenador de ownership/fallback/reconciliação persistido
por CAS no `stateJson`. Os testes usam somente provider e sender fake; não há
outbound real nesta fase.

**COORDINATOR_CONNECTED_TO_ROUTER=true.** O router recebe modo e allowlists, mas
continua default-deny: ausência/configuração inválida/OFF, escopo ausente,
turno não STANDARD, triagem, handoff, ferramenta, categoria ou autoridade não
permitida retornam `V1_DEFAULT` antes de consultar ou reclamar uma approval. A
rota V2 só existe quando coordinator, executor registrado, modo `CONTROLLED`,
duas allowlists e approval single-use exata estão presentes. O executor não tem
efeito no boot e não é chamado com os defaults OFF/vazios.
**REAL_V2_PRIMARY_EXECUTOR_CONNECTED=true.** O executor primário é limitado a
`businessHours` com autoridade `OFFICIAL_CONTEXT`: revalida o turno, a approval,
o ownership, o schedule estruturado, timezone e ausência de conflito antes de
chamar o provider oficial via DI. Ele usa o mesmo `RuntimeV2CandidateResponseGenerator`,
`ResponsePlan`, política de autoridade, timeout, `AbortSignal` e redaction do
Shadow, mas fornece somente contexto oficial de horário. Não fornece RAG,
memória factual, ferramentas, handoff, calendário ou contexto factual vindo de
flow. Antes de uma approval ser reclamada, o `FlowApplicabilityEvaluator` separa
explicitamente a seleção V1 da V2. Flows legados, inclusive os de informações da
empresa, continuam usando famílias e aliases históricos somente na V1 e são
interpretados como `V1_ONLY` pela V2 quando não possuem contrato explícito. A V2
só aceita um flow `V2_CONTROLLED` declarativo, sem knowledge, ferramenta, ação,
handoff, resposta fixa, humano ou instrução factual. A única combinação habilitada
nesta primeira entrega é `businessHours` / `ask_business_hours` /
`OFFICIAL_CONTEXT` com `runtimeDirectOnly=true`; ela não herda aliases de endereço,
telefone, contato ou site e não resolve follow-ups elípticos. Horários e demais
fatos continuam exclusivamente no contexto estruturado oficial. Qualquer contrato
ausente, inválido, ambíguo, factual ou operacional bloqueia fail-closed. A approval
guarda somente fingerprints do conjunto, vencedor, versão e contexto declarativo —
nunca o conteúdo do flow — e o router revalida tudo antes do claim, depois do claim
e novamente antes de entregar a candidata ao tail. Uma mudança antes do claim segue
V1 normal; uma mudança após o claim segue para fallback V1 antes do provider ou,
se ocorrer durante a geração, antes de qualquer persistência ou sender V2.

O prompt primário aceita somente a mensagem canônica, até seis referências da
mesma conversa, comportamento permitido, o contexto estruturado oficial e, quando
vinculado à approval, o fragmento declarativo validado do flow vencedor. O quality
gate bloqueia resposta vazia, estrutura interna, idioma/escopo impróprio,
categorias comerciais não autorizadas, efeitos operacionais e horários que não
correspondam ao schedule oficial. Falha, timeout, abort, autoridade ausente/conflitante
ou candidata bloqueada ainda ocorrem antes do sender e levam exclusivamente ao
fallback V1.
O executor retorna apenas o `ResponseExecutionEnvelope` V2; ele não persiste a
mensagem assistant, não chama o sender, não atualiza `externalMessageId` e não
consome a approval.

As `AssistantSecurityRule` ativas são carregadas somente no escopo da mesma
empresa e assistente. Além de entrarem no prompt, passam por um gate primário
fail-closed: regra inválida, exigência de humano/handoff/ferramenta, proibição de
resposta automática ou conflito com `businessHours` bloqueia V2 antes do
provider. Regras fora do tenant/assistente não entram na avaliação. O quality
gate verifica ainda divulgação interna, alegação de handoff e conteúdo comercial
não autorizado. A approval nunca substitui essas regras; bloqueio pré-sender usa
somente o fallback V1 já coordenado.

O mecanismo administrativo interno `runtime-v2-response-execution` tem quatro
comandos: `preflight`, `arm`, `status` e `cancel`. `preflight` calcula apenas o
hash canônico em memória, valida escopo, estado operacional, contexto oficial,
regras de segurança, aplicabilidade de flow e ausência de execução pendente; ele
não persiste nada nem
altera flags/allowlists. `preflight` e `arm` usam o mesmo contrato
`canonicalizeInboundMessageForComparison()`: normalização de transporte e
representação canônica acontecem uma única vez antes do hash. O `arm` reutiliza
diretamente o hash interno aprovado pelo seu preflight; ele não recalcula a partir
de texto raw, redigido ou serializado. Antes de criar a approval e depois de
reler a persistência, ele exige igualdade exata entre o hash canônico do
preflight e o hash persistido. Divergência resulta em
`ARM_CANONICAL_HASH_MISMATCH`, sem approval utilizável; uma gravação divergente
é cancelada fail-closed. A CLI aceita `--message` ou `--message-stdin`, nunca as
duas fontes, e mostra somente fingerprints no output. `arm` aceita
exclusivamente `businessHours`/`OFFICIAL_CONTEXT`, dura de um a dez minutos e
cria uma única approval `ARMED` por conversa. Só fingerprints, status e propósito
sanitizado são persistidos — nunca a mensagem futura. `status` retorna apenas estados,
datas, fingerprints e referências externas redigidas. `cancel` faz a transição
somente em `ARMED` e uma repetição retorna o mesmo estado `CANCELLED`; claim,
consumo, expiração e estados terminais não podem ser cancelados ou reativados. A CLI não habilita `CONTROLLED`, não preenche
allowlists e não altera Shadow, Evidence, actions, tools ou handoff.

O primeiro teste operacional controlado não foi capturado pelo V2: preflight e
inbound concordaram, mas a approval gravada por `arm` continha hash incompatível;
o router recusou o claim e o V1 respondeu uma única vez, sem duplicação. A causa
foi o sanitizador genérico de `stateJson`, que interpretava uma sequência
numérica dentro de um hash hexadecimal como telefone. Hashes/fingerprints da
approval agora são chaves estruturais opacas, preservadas byte a byte, enquanto
texto livre continua sujeito à redaction. Esta correção elimina a recanonicalização
independente do `arm` e a alteração de hash na persistência.

Após o deploy dessa correção, um ensaio administrativo localizou um segundo
bloqueio seguro: a conversa de validação continha uma tentativa anterior
`CANCELLED`/`TERMINAL_BLOCKED`; o formato inicial mantinha apenas um slot
`responseExecution` e recusava qualquer novo `arm`, inclusive depois de uma
conclusão terminal. O contrato agora diferencia execução ativa, incerta e
terminal. O estado persistido aceita o envelope compatível
`responseExecution: { current, history }`: a primeira tentativa nova converte
atomicamente o formato legado, preserva integralmente a tentativa terminal em
`history` e cria `current` com novo `executionId` e `attemptNumber`.

Somente tentativas terminais consistentes (`CANCELLED`, expirada sem claim,
`V2_OUTBOUND_SENT` consumida ou `V1_FALLBACK_SENT` consumida) podem ser
arquivadas para novo arm. `ARMED`, claim/ownership pendente, geração, tail,
outbound pendente, estado inválido e `RECONCILIATION_REQUIRED` continuam
fail-closed. Nenhum histórico é apagado automaticamente; a retenção permanece
protegida pelo limite já existente do `stateJson` até que uma política de
retenção versionada seja explicitamente aprovada. Coordinator e router operam
somente sobre `current`; uma tentativa no histórico nunca pode ser reclamada ou
consumida novamente.

Não há uma segunda geração Shadow nem comparação adicional para o mesmo turno
primário: `PRIMARY_EXECUTION_NO_SHADOW_COMPARISON=true`. A candidata primária é
efêmera até o tail; só seus fingerprints e metadados redigidos atravessam a
telemetria. Uma approval ARMED isolada continua incapaz de reprocessar mensagens
ou disparar execução sem todos os gates.

O primeiro outbound real foi concluído em um canário isolado, com approval
single-use, `route=V2_SINGLE_USE`, `owner=V2_PRIMARY`, uma chamada de provider
V2, zero V1/fallback, um único tail/sender e referência externa persistida. A
approval terminou `CONSUMED` e o ownership terminou `V2_OUTBOUND_SENT`; o modo
de execução, as allowlists e o vínculo temporário do inbox foram restaurados
imediatamente. A Heloísa continua bloqueada para V2 enquanto seu flow factual
permanecer aplicável.

Após um `arm` bem-sucedido, o payload administrativo é montado a partir do
snapshot `current/history` relido após o CAS — a mesma fonte de `status`. Assim,
`attemptNumber`, `historyCount`, fingerprints, hash canônico, categoria,
autoridade e indicadores de atividade/capacidade de rearmamento representam o
estado efetivamente persistido. O payload não contém mensagem, hash integral,
prompt, flow ou referência externa bruta.

**COORDINATOR_CONNECTED_TO_ROUTER=true.**
**REAL_V2_PRIMARY_EXECUTOR_CONNECTED=true.**
**PRODUCTION_EXECUTION_DEFAULT_OFF=true.**
**FIRST_REAL_V2_OUTBOUND_COMPLETED=true.**
**ISOLATED_CANARY_COMPLETED=true.**
**HELOISA_V2_ENABLEMENT_BLOCKED_BY_FACTUAL_FLOW=true.**

### Alinhamento semântico do canário multi-turn

No primeiro turno do canário multi-turn isolado, o preflight reconheceu uma
pergunta determinística de horário de atendimento, mas o router caiu em V1 por
uma expressão local mais estreita. O default-deny funcionou: não houve claim V2,
provider V2, duplicação ou segundo outbound; a approval foi terminada e toda a
configuração operacional foi restaurada.

Preflight, arm e router agora usam `resolveResponseExecutionIntent`, uma decisão
versionada e redigida construída a partir do conteúdo canônico e, quando
necessário, de no máximo seis mensagens da mesma conversa. A approval guarda
somente versão, intent e fingerprint dessa decisão; no inbound, o router a
reconstrói antes do claim e mantém V1 quando qualquer dimensão divergir. A
categoria permitida continua restrita a `businessHours` com
`OFFICIAL_CONTEXT`; entrega, pedido, agendamento, humano e perguntas ambíguas
continuam no default-deny. O canário multi-turn permanece pendente.

A estratégia de geração V1 de triagem foi extraída para um contrato interno
testável, sem mover o tail de persistência, sender, `externalMessageId` ou
Shadow. O bypass de fluxo V1 (`fixed_message` e handoff sem provider) também foi
extraído para um contrato interno testável. O núcleo iterativo do fluxo normal
(`provider → tool → provider`, com limite de cinco iterações) foi isolado em uma
estratégia testável. Um executor V1 único seleciona, com precedência preservada,
`FLOW_BYPASS`, `TRIAGE` ou `STANDARD` e retorna um envelope redigido comum ao
tail central. O `ResponseGenerationRouter` agora ocupa o seam antes desse executor
e transporta `V1_NORMAL`, `V1_FALLBACK` ou `V2_PRIMARY` até o mesmo tail. Na
integração test-only, uma approval elegível é reclamada atomicamente antes da
geração; falha pré-sender faz fallback no mesmo turno e resultado incerto do
sender V2 termina em `RECONCILIATION_REQUIRED`, sem resposta V1 adicional.
A composição produtiva registra o executor inerte por DI, mas sua rota efetiva
continua `V1_DEFAULT` enquanto o modo estiver OFF, o escopo estiver vazio ou não
existir uma approval elegível. Nenhuma approval é criada automaticamente.
A composição compartilhada de prompt/contexto e a execução detalhada de cada
ferramenta permanecem no `sendMessage` como dependências lazy do executor,
preservando a ordem e o custo existentes. O resultado atravessa o tail central
como `ResponseExecutionEnvelope`. O tail central permanece intacto e é o único
responsável por persistir a resposta, chamar o sender e atualizar
`externalMessageId`; os hooks apenas fazem transições de ownership para V2/fallback
ao redor desse sender. Em V1, falhas/resultado incerto do sender continuam com o
comportamento histórico. Shadow permanece posterior somente a `V1_NORMAL`; V2,
fallback e reconciliação não iniciam geração Shadow adicional.

## Matriz final: gaps corrigidos antes de outbound

A matriz Shadow encontrou três lacunas sem efeito externo: uma pergunta de
garantia documental não declarava categoria factual e não iniciava RAG; uma
mudança explícita de assunto não era registrada como tal; e um pedido inequívoco
de atendimento humano não chegava ao `ResponsePlan`. Nenhuma dessas execuções
enviou mensagem V2, alterou `ai_active` ou executou handoff/ferramenta.

### RAG documental autorizado

Depois do `RuntimeV2ScopeGate`, Evidence em `SHADOW_METADATA` pode iniciar uma
recuperação limitada ao mesmo `companyId` e `assistantId` quando a categoria
documental é única e elegível (`WARRANTY`, `TECHNICAL_INFORMATION`,
`COMMERCIAL_POLICY` ou `PICKUP_DELIVERY`). A recuperação usa o texto canônico
do turno, somente chunks `ACTIVE` de documentos `READY`, top-K limitado e o
threshold existente. Query, conteúdo e embedding não entram em telemetria.

O manifesto registra somente se a recuperação ocorreu, contagens separadas de
documentos/chunks candidatos, elegíveis, pontuados, rejeitados por threshold e
incompatíveis por dimensão; registra também as faixas de score, top-K, threshold,
fingerprints de documento/chunk, decisão de autoridade e motivo de bloqueio.
Query, conteúdo, embeddings e documentos integrais continuam fora da telemetria.
Um documento RAG só se torna autoridade quando a categoria está
declarada, o chunk está no escopo, ativo, acima do threshold e sem conflito. Para
essas categorias estáveis, a autoridade vencedora é `RAG_DOCUMENT`; preço,
disponibilidade e agendamento continuam exigindo fonte estruturada ou ferramenta.
Sem chunk selecionado, o plano fica `SAFE_UNAVAILABLE`, a candidata é bloqueada
antes do provider e não pode produzir afirmação factual.

### Mudança explícita e pedido humano

Marcadores como “agora outro assunto”, “mudando de assunto”, “falando de outra
coisa”, “tenho outra dúvida” e “esquece isso” registram
`topicChanged=true`, `topicChangeReason=EXPLICIT_TOPIC_CHANGE`, tópico anterior
quando confiável, tópico atual e a decisão explícita de herança
(`inheritanceEvaluated`, `inheritanceAllowed` e `inheritanceBlockReason`).
`inheritedTopicSuppressed` só é verdadeiro quando existia uma herança candidata
que foi realmente suprimida; sua ausência não é interpretada como permissão.
Eles não substituem follow-ups reais, que
continuam limitados às seis mensagens da própria conversa.

Pedidos inequívocos de humano, incluindo preferência por falar com pessoa ou
atendente, suporte humano, recusa de continuar com IA ou pedido de transferência,
produzem `humanRequested=true` e `handoffRequired=true`. Em Shadow, o plano é
`HANDOFF` com `handoffStatus=REQUIRED_NOT_EXECUTED`: execução, pausa de IA,
assignment, label, status e envio externo continuam inacessíveis. A candidata é
marcada `CANDIDATE_REQUIRES_HANDOFF` antes do provider e não pode alegar que a
transferência aconteceu.

Os critérios para repetir os cenários A, C e D são: RAG vencedor e suportado por
chunk autorizado; mudança explícita com herança factual suprimida; e pedido humano
reconhecido sem execução. Preço sem diagnóstico e agendamento sem ferramenta
continuam bloqueados ou limitados a esclarecimento seguro.

## Canário isolado: contexto de follow-up versionado

`FIRST_REAL_V2_OUTBOUND_COMPLETED=true` e o turno direto do canário isolado foram
confirmados com uma única execução V2, sem V1 paralelo e com restauração integral.
O follow-up de horário teve preflight aprovado, mas permaneceu em V1 no inbound
antes do claim; o default-deny e a ausência de duplicação foram preservados.

Na segunda tentativa real de follow-up, a auditoria forense confirmou que preflight
e router reconstruíam o mesmo contexto e antecedente, mas o fingerprint de contexto
persistido na approval havia sido alterado pelo sanitizador genérico de stateJson:
uma sequência numérica dentro do identificador opaco foi interpretada como telefone.
O router carregou a approval e aplicou corretamente
`RESPONSE_EXECUTION_CONTEXT_MISMATCH` antes do claim; o motivo não chegava ao
runtime log. Fingerprints explícitos da approval agora são preservados byte a byte e
o motivo sanitizado da decisão do router é persistido para auditoria. O reteste real
do follow-up continua pendente.

A correção subsequente elimina os builders paralelos de histórico. Preflight e
router usam o mesmo contrato versionado de contexto conversacional: mensagens
conversacionais da mesma conversa e `contextVersion`, janela limitada e ordenada
por data/identidade, exclusão do inbound atual por ID e antecedente opaco de
`businessHours`. Approval persiste apenas versão e fingerprints opacos do contexto
e antecedente. Divergência contextual bloqueia o claim com diagnóstico sanitizado;
follow-up sem antecedente suficiente, após mudança de assunto ou fora da janela
continua no default-deny. O reteste do follow-up e o Turno 3 permanecem pendentes.

`ISOLATED_CANARY_DIRECT_TURN_COMPLETED=true`
`ISOLATED_CANARY_FOLLOW_UP_COMPLETED=false`
`ISOLATED_CANARY_FOLLOW_UP_DEFERRED_TO_V1=true`
`ISOLATED_CANARY_COMPLETED=true`
`HELOISA_V2_ENABLEMENT_BLOCKED_BY_FACTUAL_FLOW=true`

## Escopo explícito de flow para a primeira entrega da Heloísa

A configuração atual da Heloísa permanece sem alteração. Seus flows legados têm
knowledge/tool context e família institucional ampla; por isso permanecem `V1_ONLY`
e não habilitam a V2 automaticamente. O contrato opcional do flow possui
`runtimeScope`, `runtimeCategory`, `runtimeIntent`, `runtimeAuthority` e
`runtimeDirectOnly`. A ausência do contrato é fail-closed para V2 e preserva o
comportamento V1 existente.

Para a migração de configuração posterior, somente um flow declarativo novo poderá
declarar `V2_CONTROLLED`, `businessHours`, `ask_business_hours`,
`OFFICIAL_CONTEXT` e atendimento direto. O flow institucional atual continua na
V1 para endereço, telefone, contato, site e demais informações; follow-ups de
horário também permanecem na V1. A migração de configuração e o canário real da
Heloísa continuam pendentes.

## Escopo Assistant-Wide para Ativação Progressiva da Runtime V2

Para permitir a ativação progressiva da Runtime V2 de forma escalável sem a necessidade de enumerar exaustivamente cada conversa individualmente, foi introduzido o escopo de conversas do assistente (Assistant-Wide).

### Configurações de Escopo

O escopo de rollout de respostas controladas é governado pela variável de ambiente:

- `RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_SCOPE`: Define a granularidade do escopo.
  - `EXPLICIT_CONVERSATIONS` (padrão): Exige que cada conversa esteja listada explicitamente na allowlist de conversas (`RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_IDS`).
  - `ASSISTANT_WIDE`: Ativa a avaliação da Runtime V2 para todas as conversas do assistente ativo, sob as seguintes regras rígidas de segurança multi-tenant:
    1. O assistente correspondente deve estar listado na allowlist de assistentes (`RUNTIME_V2_RESPONSE_EXECUTION_ASSISTANT_IDS`).
    2. A allowlist de conversas (`RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_IDS`) deve estar **completamente vazia** (para garantir que não haja configurações híbridas confusas).
    3. O assistente deve possuir pelo menos uma caixa de entrada (inbox) vinculada no banco de dados (avaliado por `chatwootInboxConfig` > 0).
    4. Qualquer violação dessas regras falha fechada (fail-closed) com códigos de rejeição específicos (ex: `CONVERSATION_ALLOWLIST_NOT_EMPTY`, `ASSISTANT_NOT_ALLOWLISTED`, `INBOX_NOT_CONNECTED`).

Esta mudança permite habilitar a V2 para todo o assistente da Heloísa de forma limpa, mantendo o controle centralizado de escopo e isolamento multi-tenant.

## Approval automática single-use controlada

`RUNTIME_V2_RESPONSE_EXECUTION_APPROVAL_MODE` permanece `MANUAL` por padrão:
sem uma approval administrativa armada, o turno continua na V1. O modo opcional
`AUTO_SINGLE_USE` só é avaliado durante a chegada de um novo inbound em escopo
`CONTROLLED`; ele não consulta histórico no boot e não cria approval, provider ou
sender retroativamente.

Antes de criar a approval automática, o router revalida o flow e executa o mesmo
preflight interno. A única combinação suportada é um flow declarativo explícito
`V2_CONTROLLED` de `businessHours` / `ask_business_hours` /
`OFFICIAL_CONTEXT`, com atendimento direto, sem knowledge, ferramentas, ações,
handoff, mensagem fixa ou exigência humana. Follow-ups contextuais e qualquer
combinação fora desse contrato continuam na V1.

A approval automática tem `maxUses=1`, expira em cinco minutos e recebe o propósito
sanitizado `AUTO_SINGLE_USE_EXPLICIT_V2_INBOUND`. Ela é vinculada ao hash canônico
e ao `internalMessageId` do inbound que a criou; o preflight exclui esse inbound do
histórico antes de aplicar a janela conversacional. A criação concorrente reutiliza
somente a approval compatível já armada e o claim continua protegido por CAS.

Uma approval terminal de um turno anterior não participa da decisão semântica de
um novo inbound automático: ela é arquivada pelo store quando o novo preflight/arm
canônico cria a próxima attempt. Em contraste, uma approval automática terminal
vinculada ao mesmo `internalMessageId` é um replay e permanece terminal, sem novo
preflight, provider, sender ou fallback V1. Essa separação evita que uma approval
MANUAL histórica provoque `RESPONSE_EXECUTION_SEMANTIC_MISMATCH` antes da criação
da approval automática do novo turno.

Contexto legado é aceito apenas quando todos os campos contextuais são nulos ou
ausentes. Um contexto parcialmente persistido, ou qualquer diferença de versão,
fingerprint ou antecedente, bloqueia antes do claim. Fingerprints opacos permanecem
íntegros no `stateJson`; redaction ocorre apenas nas superfícies de observabilidade.

O contrato continua fail-closed: a correção é somente de código e testes locais e
não altera flows, knowledge ou configuração real da Heloísa.

### Incidente pós-ativação: lotes de inbound e horário empresarial

Em um incidente real posterior à ativação controlada, a evidência sanitizada
confirmou que o buffer de mensagens preservou todos os inbounds: uma saudação
que chegou antes da janela foi processada isoladamente e os fragmentos seguintes
foram reunidos em um único turno. A regressão garante que cada fragmento presente
na janela chega ao prompt do único turno, sem criar resposta duplicada ou
descartar conteúdo persistido.

O mesmo turno combinava coleta e horário. O fuso `America/Campo_Grande` já era
aplicado corretamente; o problema era o guardião V1, que deixava uma menção a
horário sobrescrever a categoria segura de coleta. Agora `business_hours` só tem
precedência para pergunta direta, sem outra solicitação operacional explícita.
Perguntas diretas de horário usam a agenda estruturada mesmo fora do expediente;
o estado aberto/fechado só complementa perguntas sobre o momento atual.

### Cobertura de múltiplas solicitações no mesmo turno V1

Um lote pode ter um único flow operacional principal e ainda conter solicitações
explícitas secundárias. O runtime agora registra, de forma sanitizada, a intenção
principal, as intenções secundárias, a quantidade de fragmentos e a cobertura da
resposta. O compilador exige que a resposta curta reconheça cada solicitação
explícita antes de fazer no máximo uma pergunta de avanço.

Não há novo router, provider, flow produtivo ou outbound para cada fragmento. Se
o provider omitir uma solicitação explícita, o runtime acrescenta somente um
reconhecimento seguro ou uma resposta de horário baseada no contexto estruturado.
Afirmações de coleta ou retirada continuam fail-closed: "preciso confirmar" não
é tratado como disponibilidade prometida pelo guardião de autoridade.
