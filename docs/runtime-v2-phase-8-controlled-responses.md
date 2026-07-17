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
