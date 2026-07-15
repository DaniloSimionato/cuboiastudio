# Runtime V2 — Fase 6.1A: inventário e contrato canônico de fontes factuais

Status: proposta de arquitetura e auditoria somente. Nenhum código produtivo, banco, configuração ou deployment foi alterado nesta fase.

## 1. Escopo e conclusão executiva

O objetivo desta fase foi separar o que já existe no Runtime V1, o que o Runtime V2 Shadow efetivamente faz hoje e o que deverá ser implementado na Fase 6.1B.

Conclusões principais:

- O V1 possui fontes reais para contexto oficial, flows, conhecimento/RAG, memória de contato, histórico, ferramentas Google Calendar e custom webhooks.
- O V1 compila essas fontes para o provider e, depois da geração, aplica o `RuntimeAuthorityGuard`.
- O V1 considera histórico como contexto conversacional, mas a autoridade factual precisa continuar sendo decidida por fonte explícita; histórico e resposta antiga do modelo não devem autorizar fatos comerciais.
- O RAG atual é filtrado por `companyId`, `assistantId`, status do chunk e status `ACTIVE`/`READY` do conhecimento. A busca ainda calcula cosine similarity em memória no Node.js.
- O threshold RAG efetivo observado no código é `0.70` por default, via `DEFAULT_RAG_SCORE_THRESHOLD`/`normalizeRagScoreThreshold`.
- A memória de contato é persistida e pode ter busca estruturada e semântica; possui expiração, confidence, origem e referências de conversa/mensagem. `memorySharedAcrossAssistants` exige uma política explícita de escopo antes de ser consumida pelo V2.
- O V2 Shadow atual não consulta essas fontes reais. O orquestrador usa `emptyContext()` para memória, conhecimento, fatos oficiais e ferramentas; seus planos são preparatórios e sua persistência é isolada.
- Não há justificativa para migration na primeira implementação da Fase 6.1B. Os contratos podem começar em memória e nos campos JSON/manifestos existentes, com qualquer registro durável de catálogo de fontes sendo uma decisão posterior.

Runtime V2 permanece operacionalmente OFF, conforme o estado informado para esta fase.

## 2. Inventário das fontes existentes

### 2.1 Matriz resumida

| Fonte | Modelo/tabela | Leitura observada | Escopo | Proveniência/freshness atuais | Uso V1 | Uso V2 atual | Riscos/lacunas |
|---|---|---|---|---|---|---|---|
| Contexto oficial do assistente/empresa | `Assistant`, relação `Company` | `buildOfficialBusinessContext()` em `assistants/official-business-context.ts`, montado pelo `AssistantsService` e pelo runtime de conversas | `companyId` e `assistantId`; timezone da empresa/assistente | Campos estruturados; `weeklySchedule`; sem versão de evidência ou `validUntil` por campo | Entra no contexto oficial do prompt e em respostas determinísticas | Apenas tipo/categoria preparada; não é carregado pelo Shadow atual | Conflito entre campos estruturados e instruções de flow não possui catálogo de conflitos persistido |
| Endereço e localização | Campos do `Assistant`: endereço, cidade, estado, região, CEP, Maps/latitude/longitude | Mesmo contexto oficial | Empresa/assistente | Valor atual do registro; sem `observedAt`/`validUntil` específico | Usado no contexto oficial e em respostas determinísticas | Não consultado | Falta proveniência por campo e política de edição/auditoria |
| Telefone, WhatsApp e site oficiais | Campos do `Assistant`: telefone, WhatsApp, suporte, site | Mesmo contexto oficial | Empresa/assistente | Estruturado, porém nullable; sem fonte/validade por campo | Usado quando presente; ausência deve resultar em informação não disponível | Não consultado | Não confundir com telefone do remetente; ausência deve ser distinguida de falha de recuperação |
| Horários e exceções operacionais | `Assistant.weeklySchedule`, `timezone`, `aiAlwaysAvailable`; cálculo em `official-business-context.ts` | `normalizeBusinessHoursSchedule()` e `getBusinessOpenStatus()` | Assistente/empresa e timezone resolvido | Schedule normalizado e status calculado no momento; não há histórico/versionamento de alterações | Usado no contexto oficial e em fallback fora do horário | Não consultado | Horário de funcionamento não é disponibilidade de agenda nem confirmação de booking |
| Flows | `AssistantFlow` | `assistant.flows`, `IntentRouterService`, `scoreFlowCandidates()` | `assistantId`; implicitamente tenant pela relação | `active`, `priority`, keywords, descrição, exemplos e instruções; sem autoridade factual nativa | Seleção de flow, triagem, instruções, escopo de conhecimento e ferramentas | V2 recebe no máximo IDs/sinais comparativos; não carrega flows reais no Shadow | Flow é orientação operacional, não verdade oficial; não existe `authorityLevel`/`sourceType` no modelo |
| Base de conhecimento/RAG | `AssistantKnowledge`, `AssistantKnowledgeChunk` | `AssistantKnowledgeRetrievalService.searchRelevantKnowledge()` | `companyId` + `assistantId`; conhecimento/chunk ACTIVE e READY | `processedAt`, `updatedAt`, status, embedding model/dimension, metadata; sem validade factual por campo | Busca embedding, filtra threshold, injeta chunks no PromptCompiler V1 | V2 apenas cria `knowledgeQueries` no `RetrievalPlan`; não busca | Conteúdo e metadata podem ser sensíveis; cosine em memória; freshness sem política de domínio |
| Embeddings | `AssistantKnowledgeChunk.embedding` (`Float[]`), `embeddingModel`, `embeddingDimension`; memória usa vector | `AiService.generateEmbedding()`/runner; RAG calcula cosine; memória usa busca vetorial SQL | Herdado do recurso pai | Modelo/dimensão persistidos; versão/freshness não padronizados para RAG | RAG e memória semântica | Não chamado pelo V2 Shadow | Custo, latência, mismatch de dimensão e falta de contrato único de embedding |
| Memória de contato | `ContactMemoryProfile`, `ContactMemoryItem`, `ContactMemoryEvent` | `ContactMemoriesService`; extração em `ContactMemoriesExtractionService`; busca estruturada/semântica | `companyId` obrigatório; perfil por identidade; `assistantId` pode ser nulo; conversa/mensagem opcionais | `confidence`, `sourceType`, `sourceConversationId`, `sourceMessageId`, `expiresAt`, `lastSeenAt`, active/deleted, timestamps | Pré-prompt e extração pós-turno quando flags do assistente permitem; busca semântica opcional | Não consultada nem alterada | `memorySharedAcrossAssistants` default true pode ampliar escopo; memória nunca autoriza preço/política |
| Memória temporária | `ContactMemoryItem.category`, `expiresAt` | Filtros de expiração no service | Perfil/empresa; opcionalmente assistente | Expiração explícita, default configurável no assistente | Pode entrar no contexto se ativa | Não consultada | Deve ser diferenciada de fato de sessão e não sobreviver além da validade |
| Histórico da conversa | `AssistantConversationMessage` | Seleção/compactação no `AssistantConversationsService` | `companyId`, `assistantId`, `conversationId`, `contextVersion` | `createdAt`, `contextVersion`, role/source/messageType, IDs externos | Histórico útil entra no prompt; mensagens repetidas podem ser compactadas | Snapshot sanitizado/useful history pode chegar ao Shadow; não é autoridade | Resposta antiga do modelo pode contaminar continuidade se não for classificada como histórico citado |
| Mensagem atual do cliente | `AssistantConversationMessage` após normalização/persistência | `sendMessage()` e ingressos Chatwoot/interno | Conversa/tenant/assistente e contextVersion | ID interno/externo, tipo, source, timestamps; áudio pode ter transcrição persistida | Fonte primária da intenção e dos fatos declarados pelo cliente | `currentMessage` do snapshot; usada pelo TurnUnderstanding | Metadata técnica não deve entrar no IntentRouter; texto do cliente não autoriza política da empresa |
| Resultado de ferramenta | Google Calendar e custom webhook services | `CalendarToolsService`, serviços Google Calendar, execução de custom webhook no runtime de conversas | `companyId`, installation/resource/assistant/flow conforme ferramenta e escopo | Booking tem idempotency key/status/timestamps; resultado de tool ainda precisa de envelope comum | Exposto conforme `AssistantToolConfig`, flow e escopos; provider pode solicitar tool calls | V2 não executa ferramenta; apenas indica `toolCapabilitiesNeeded` | Ferramentas de escrita têm efeitos externos; resultado deve ser atual, escopado e diferenciado de intenção do modelo |
| Google Agenda | `GoogleCalendarResource`, `GoogleCalendarBooking`, instalações/apps | `GoogleCalendarAvailabilityService`, `GoogleCalendarBookingService`, `CalendarToolsService` | `companyId`, installation, resource, conversation quando aplicável | Recursos ativos, timezone, janela mínima/máxima; booking status, horários e idempotência | Pode verificar disponibilidade/criar/rescheduling/cancelamento conforme permissões | Não consultado | Aberto não significa vaga; booking sem ferramenta/ação persistida não pode ser afirmado |
| Custom webhooks | `CustomWebhookAction` e instalações | Resolver/executar webhook com validação de schema, permissões e escopo | `companyId` + instalação; flow/assistant permissioning | Configuração, timeout, filtros e status; resposta precisa de sanitização | Pode ser tool exposta pelo V1 | Não executado pelo V2 | URL, headers, auth e body são sensíveis; resultado pode ser parcial ou não confiável |
| Configuração Chatwoot | `ChatwootInboxConfig`; normalizador/webhook/downloader | `chatwoot-webhook.service.ts`, normalizador e config service | `companyId`, inbox/account, opcional `assistantId` | active, account/inbox, diagnósticos/timestamps; tokens criptografados | Define ingresso, origem, IDs externos e anexos | V2 recebe somente snapshot mínimo após normalização | Payload integral, token, telefone e anexos não devem seguir para fontes/manifestos |
| Confirmação humana | Mensagens com role/source humano, campos de handoff/logs; não há entidade factual única | Histórico, handoff e logs do runtime | Conversa/tenant; equipe/humano conforme origem | ID/timestamp da mensagem; classificação factual não padronizada | Pode influenciar continuidade e handoff | Não consultada como autoridade por padrão | “Humano” sem classificação não deve substituir contexto oficial |
| Modelo/provider | Não é fonte persistida como autoridade; resposta em mensagens/logs | `AiService`/provider e PromptCompiler | Execução atual | provider/model/status/duração em `AssistantRuntimeLog`; conteúdo deve ser tratado como geração | Gera resposta sujeita ao AuthorityGuard | V2 não chama provider | `MODEL_GENERATED` nunca autoriza preço, horário, disponibilidade ou política |

### 2.2 Modelos de suporte relevantes

`AssistantRuntimeLog.metadata` é JSON e já suporta metadata sanitizada de runtime sem migration. O próprio log possui campos estruturais para intenção, flow, contagem de conhecimento, histórico, ferramentas, fallback e status.

`AssistantConversationMessage.sources` é JSON e pode carregar referências sanitizadas por mensagem, mas não deve virar a fonte operacional do ConversationState V2.

`AssistantConversationSession` já separa `contextVersion`, status, início/fim, reset, motivo e resumo. É o candidato natural para delimitar sessão; não deve ser substituído por um campo ad hoc no histórico.

## 3. Mapa do pipeline atual

### 3.1 Runtime V1 — caminho observado

```text
ingresso interno/Chatwoot
  → normalização de origem, tipo e anexo
  → persistência da mensagem do cliente
  → resolução de conversa/contextVersion
  → customerIntentText (texto real ou transcrição)
  → resolução do Assistant e flows ativos
  → IntentRouterService
  → triagem e TriageFlowContext
  → memória estruturada/semântica, se habilitada
  → RAG, se ragEnabled
  → contexto oficial estruturado
  → histórico selecionado/compactado
  → ferramentas permitidas pelo assistente/flow/escopo
  → PromptCompiler V1
  → provider V1
  → RuntimeAuthorityGuard pós-provider
  → persistência da resposta/log
  → outbound V1
```

Observações de implementação:

1. O `IntentRouterService` recebe `customerIntentText`, não o texto enriquecido com metadata. Ele avalia todos os flows ativos, usa evidências/aliases e prioridade somente como desempate.
2. A triagem cria um resumo seguro do flow selecionado, campos conhecidos/pendentes e próxima pergunta; em triage o V1 não expõe ferramentas reais.
3. A memória é lida no `AssistantConversationsService` quando as flags do assistente permitem. Há caminho estruturado e caminho semântico; a busca semântica exige item ativo, não excluído, não expirado, embedding READY e threshold configurado.
4. O RAG lê chunks do assistente/tenant com conhecimento ACTIVE e READY. No runtime normal usa limite maior que triagem; os IDs e scores são registrados no metadata de runtime, enquanto o conteúdo é enviado ao compilador conforme a execução.
5. O contexto oficial é construído de campos estruturados do assistente/empresa, horário normalizado e status calculado. Ele inclui uma instrução de prioridade no prompt, mas o contrato canônico proposto abaixo deverá tornar essa prioridade verificável fora do texto.
6. O histórico é selecionado por janela, compactado e citado como contexto. Deve permanecer separado de `SourceEvidence` autorizada.
7. Ferramentas são resolvidas por configuração do assistente, flow, instalação e escopo. Google Calendar tem caminho de disponibilidade/booking; custom webhooks têm configuração e permissões próprias.
8. O provider pode gerar uma categoria errada. O `RuntimeAuthorityGuard` é a última barreira do V1, mas a Fase 6.1B deve dar ao guard um envelope factual estruturado para não inferir autoridade apenas do texto gerado.
9. Há caminhos deterministic-runtime/flow-bypass em que provider ou RAG não são usados. O manifesto precisa registrar o caminho efetivo, não presumir que toda mensagem percorreu provider.

### 3.2 Runtime V2 Shadow — caminho observado

```text
mensagem normalizada e persistida
  → snapshot mínimo e sanitizado
  → feature flag/allowlist
  → carga do ConversationState V2 isolado por escopo
  → TurnUnderstanding
  → atualização determinística do estado
  → RetrievalPlan (somente plano)
  → AuthorityPolicy sobre contexto recebido
  → ResponsePlan
  → ResponseValidator estrutural
  → save/retry optimistic concurrency
  → manifesto Shadow sanitizado
```

No código atual do Shadow:

- `emptyContext()` cria listas vazias para `identityMemories`, `thematicMemories`, `officialFacts`, `knowledgeChunks` e `toolResults`;
- `RetrievalPlan` deriva categorias, tópicos e capacidades de ferramenta, mas não invoca os adapters reais;
- `AuthorityPolicy` conhece categorias e tipos permitidos, porém sua decisão depende do contexto já entregue ao orquestrador;
- `PromptCompilerV2` aceita contexto oficial, contexto recuperado e histórico útil, mas o orquestrador atual não preenche esses recursos com fontes reais;
- nenhum provider V2, ferramenta V2, memória V2, RAG V2 ou outbound V2 é chamado;
- o estado V2 persiste fatos, objetivo, perguntas e revisões, não a resposta integral nem prompt.

Portanto, a Fase 6.1B deve introduzir leitura de fontes como uma camada explícita de retrieval/evidence, sem acoplar o domínio V2 ao Prisma nem permitir efeitos externos.

## 4. Taxonomia canônica proposta

Os nomes abaixo são proposta de contrato genérico, não alteração aplicada.

| Tipo | Significado | Pode autorizar fato comercial? |
|---|---|---:|
| `OFFICIAL_STRUCTURED` | Campo estruturado administrado no tenant/assistente/empresa, com categoria explícita | Sim, quando vigente e no escopo |
| `OFFICIAL_DOCUMENT` | Documento oficial aprovado, versionado e com proveniência | Sim, quando vigente, no escopo e acima do limiar |
| `TOOL_RESULT` | Resultado atual de ferramenta autorizada, com escopo e timestamp | Sim, para a categoria coberta pelo resultado |
| `HUMAN_CONFIRMED` | Confirmação humana explicitamente classificada e vinculada à conversa | Somente conforme política aprovada para a categoria |
| `FLOW_GUIDANCE` | Instrução/triagem/roteamento configurado em flow | Não por padrão; só aponta para fonte ou autoriza comportamento |
| `CONTACT_MEMORY` | Fato/preferência do contato, com origem e expiração | Não para política/preço/horário da empresa |
| `SESSION_FACT` | Fato temporário da sessão, geralmente declarado pelo cliente | Não para política da empresa; sim para fatos do próprio cliente quando pertinentes |
| `CONVERSATION_HISTORY` | Histórico citado para continuidade e referência | Não |
| `EXTERNAL_METADATA` | Dados técnicos do canal, payload, IDs, origem e anexos | Não |
| `CUSTOMER_PROVIDED` | Conteúdo atual declarado pelo cliente, separado de metadata | Para fatos sobre o próprio cliente, com confiança e escopo da conversa; não para política da empresa |
| `MODEL_GENERATED` | Texto ou inferência produzida por provider/modelo | Nunca |

`FLOW_GUIDANCE` e `MODEL_GENERATED` não devem ser promovidos a fato só porque aparecem em prompt, histórico ou resposta anterior.

## 5. Contrato canônico de evidência

O contrato deve ser serializável em JSON, sem classes complexas nem `Date` implícito. Datas seriam ISO-8601 na fronteira persistida; IDs e valores sensíveis devem ser sanitizados nos logs.

```ts
type EvidenceSourceType =
  | "OFFICIAL_STRUCTURED"
  | "OFFICIAL_DOCUMENT"
  | "TOOL_RESULT"
  | "HUMAN_CONFIRMED"
  | "FLOW_GUIDANCE"
  | "CONTACT_MEMORY"
  | "SESSION_FACT"
  | "CONVERSATION_HISTORY"
  | "EXTERNAL_METADATA"
  | "CUSTOMER_PROVIDED"
  | "MODEL_GENERATED";

type FreshnessStatus = "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN";

type SourceEvidence = {
  sourceType: EvidenceSourceType;
  sourceId: string;
  tenantId: string;
  assistantId?: string;
  contactId?: string;
  conversationId?: string;
  contextVersion?: number;
  category: string;
  fieldKey: string;
  normalizedValue: string | number | boolean | null | Record<string, unknown>;
  confidence: number;
  authorityLevel: "NONE" | "CONTEXTUAL" | "AUTHORITATIVE";
  observedAt: string;
  validFrom?: string | null;
  validUntil?: string | null;
  freshnessStatus: FreshnessStatus;
  provenance: {
    sourceTable?: string;
    sourceRecordId?: string;
    sourceMessageId?: string;
    sourceChunkId?: string;
    sourceTool?: string;
    sourceVersion?: string;
    selectionReason?: string;
  };
  isSensitive: boolean;
  isAuthoritative: boolean;
  metadata?: {
    score?: number;
    status?: string;
    tenantScope?: string;
    redactionVersion?: string;
  };
};

type AuthorityDecision = {
  requestedCategory: string;
  candidateEvidence: Array<Pick<SourceEvidence, "sourceType" | "sourceId" | "category" | "fieldKey" | "confidence" | "freshnessStatus">>;
  winningEvidence: string[];
  rejectedEvidence: Array<{ sourceId: string; reason: string }>;
  conflictDetected: boolean;
  conflictReason?: string | null;
  resolutionMethod: "PRECEDENCE" | "FRESHNESS" | "TOOL_RESULT" | "NO_AUTHORITY" | "CONFLICT_SAFE";
  fallbackCategory: string;
  decisionStatus: "AUTHORIZED" | "MISSING" | "CONFLICT" | "STALE" | "REJECTED";
};

type RetrievalBundle = {
  officialEvidence: SourceEvidence[];
  documentEvidence: SourceEvidence[];
  ragEvidence: SourceEvidence[];
  memoryEvidence: SourceEvidence[];
  toolEvidence: SourceEvidence[];
  sessionEvidence: SourceEvidence[];
  historyEvidence: SourceEvidence[];
  conflicts: AuthorityDecision[];
  missingCategories: string[];
};
```

Adaptações reutilizáveis existentes:

- `Runtime V2 RetrievedItem` já possui `sourceType`, `category`, `confidence`, `relevanceScore`, `scope`, `authoritativeFor` e `expiresAt`;
- `AuthorityPolicy` já modela categorias, tipos autorizados e obrigatoriedade;
- `AssistantRuntimeLog.metadata` já suporta decisão sanitizada;
- `AssistantKnowledgeChunk`/`ContactMemoryItem` já carregam parte da proveniência;
- `AssistantConversationMessage.sources` já é um local possível para referências por mensagem, sem transformá-lo em estado operacional.

Recomendação: evoluir esses tipos para um envelope comum, em vez de criar modelos paralelos com semântica duplicada.

## 6. Precedência proposta por categoria

Precedência geral:

1. regras invariáveis de segurança;
2. `OFFICIAL_STRUCTURED` vigente;
3. `TOOL_RESULT` atual e autorizado;
4. `OFFICIAL_DOCUMENT` vigente;
5. `HUMAN_CONFIRMED` explicitamente classificado;
6. `FLOW_GUIDANCE` não conflitante;
7. RAG/documento acima do limiar e com proveniência;
8. memória relevante, somente para categorias permitidas;
9. fatos da sessão/mensagem atual do cliente para o próprio cliente;
10. histórico como contexto;
11. conhecimento geral/modelo somente para redação não factual.

Por categoria:

| Categoria | Fonte vencedora preferencial | Restrições |
|---|---|---|
| Identidade da empresa | `OFFICIAL_STRUCTURED`, depois documento oficial vigente | Tenant/assistente corretos |
| Endereço/localização | `OFFICIAL_STRUCTURED`, depois documento oficial vigente | Nunca usar histórico ou telefone do cliente |
| Telefone/WhatsApp/site | Campo oficial estruturado, depois documento oficial atual | Ausência deve ser `MISSING`, sem invenção |
| Horário de funcionamento | Schedule oficial normalizado | Horário não prova disponibilidade nem agenda |
| Exceção de horário | Ferramenta/confirmacão humana ou contexto explícito de exceção | Flow conflitante perde |
| Preço/desconto | Fonte oficial estruturada/documento vigente ou ferramenta autorizada | Histórico, memória e provider nunca autorizam |
| Disponibilidade | Resultado atual de ferramenta; contexto oficial somente quando explicitamente cobre disponibilidade | “Aberto” não equivale a “há vaga” |
| Agendamento | Ferramenta autorizada e ação persistida | Sem agenda: `SAFE_UNAVAILABLE`/confirmação |
| Coleta/entrega | Política oficial atual ou ferramenta | “Vir buscar” é pedido do cliente, não política |
| Prazo | Ferramenta ou fonte oficial vigente | Não inferir de preço/flow |
| Garantia/política comercial | Fonte oficial vigente ou ferramenta | Memória/histórico não autoriza |
| Informação técnica do equipamento | Cliente atual/sessão para o que foi declarado; documento técnico aprovado para compatibilidade | Valores desconhecidos permanecem pendentes |
| Preferência do contato | Mensagem atual, sessão ou memória com origem/expiração | Não virar regra da empresa |
| Dado pessoal do cliente | Mensagem atual ou memória autorizada no escopo | Não expor em logs/manifests |

Em conflito entre fontes de mesma autoridade, não escolher silenciosamente: marcar `CONFLICT`, preservar os IDs sanitizados e usar fallback seguro até revisão/atualização.

## 7. Freshness e validade

Estados:

- `CURRENT`: fonte no escopo, status ativo, observada dentro da validade e sem conflito vigente;
- `STALE`: fonte ainda não expirada formalmente, mas fora da janela de atualização definida para sua categoria;
- `EXPIRED`: `validUntil`/`expiresAt` vencido, item inativo ou booking não vigente;
- `UNKNOWN`: fonte sem data suficiente, documento sem versão/validade ou resultado sem timestamp confiável.

Regras propostas:

- documento sem data não deve ser promovido automaticamente a `CURRENT`; fica `UNKNOWN` até política de aprovação;
- flow antigo é `FLOW_GUIDANCE` e no máximo `STALE` como instrução, nunca autoridade por idade;
- memória temporária depende de `expiresAt`; item expirado não entra no bundle;
- schedule estruturado usa `updatedAt` do assistente e precisa de uma política de validade operacional, ainda a aprovar;
- resultado de ferramenta usa `observedAt`, TTL curto e a validade específica da operação;
- preço de catálogo exige versão/validade de catálogo ou fica `STALE/UNKNOWN`;
- confirmação humana precisa de timestamp, autor/classificação e categoria; sem isso é contexto, não autoridade;
- duas fontes oficiais com valores diferentes produzem conflito, independentemente de qual foi lida por último;
- fonte fora do tenant, assistente, contato ou conversa exigidos é rejeitada como `OUT_OF_SCOPE`, nunca apenas rebaixada por score.

Não fixar TTLs de negócio no runtime genérico sem aprovação por categoria; o adapter deve receber a política de freshness configurável.

## 8. Diagnóstico do RAG atual

Implementação observada:

- `AssistantKnowledge` guarda documento/título/conteúdo/status/processamento/metadata;
- `AssistantKnowledgeChunk` guarda `companyId`, `assistantId`, `knowledgeId`, índice, conteúdo, embedding, modelo e dimensão;
- somente chunks `ACTIVE` de knowledge `ACTIVE` e `processingStatus=READY` entram na busca;
- o assistant é validado dentro do tenant antes da consulta;
- o query embedding é gerado por `AiService`, com uso observado de `text-embedding-3-small` no runtime/runner;
- cosine similarity é calculada em memória no processo Node.js;
- `topK` padrão é 5, com máximo 20; o runtime de conversa reduz o limite em triagem;
- o threshold efetivo default é `0.70`; a origem é registrada como default/explicit/default_invalid;
- score, IDs de chunks, contagens e faixa rejeitada aparecem no metadata de contexto/runtime;
- o PromptCompiler V1 recebe os itens selecionados; o V2 atual apenas planeja `knowledgeQueries`.

Lacunas para a Fase 6.1B:

- o contrato de chunk não padroniza `validFrom`, `validUntil`, versão factual ou aprovação humana;
- metadata pode conter conteúdo livre e precisa ser redigida antes do manifesto;
- não há decisão canônica de autoridade por categoria derivada do chunk;
- o threshold de relevância não substitui autoridade nem freshness;
- a solução em memória tem risco de latência/memória em escala; pgvector segue como decisão futura, não desta subfase;
- a futura leitura V2 deve receber somente evidências resumidas/IDs e categorias no Shadow, nunca prompt ou conteúdo integral por padrão.

## 9. Diagnóstico da memória atual

Implementação observada:

- `ContactMemoryProfile` é escopado por `companyId` e identidade do contato, com IDs de canal/conta e timestamps;
- `ContactMemoryItem` possui categoria, chave, valor/JSON, confidence, `sourceType`, referências de conversa/mensagem, expiração, ativo/deletado e timestamps;
- `ContactMemoryEvent` registra alterações com origem e referências;
- o assistente controla `memoryEnabled`, pré-prompt, extração, categorias permitidas, confidence threshold, dias default e `memorySharedAcrossAssistants`;
- memória semântica é opcional, usa embeddings vetoriais e busca SQL com `companyId`, `profileId`, ativo, não deletado, não expirado, embedding READY e threshold default 0.7;
- há cache de embedding de query e reindexamento de itens;
- o V1 consulta memória antes do PromptCompiler quando habilitada e extrai memória depois do turno conforme a configuração;
- o V2 Shadow atual não consulta nem escreve memória.

Política canônica necessária:

- fatos/preferências do contato podem ser `CONTACT_MEMORY` contextual;
- fatos temporários devem ter expiração e não podem contaminar nova contextVersion sem regra explícita;
- preço, horário, disponibilidade, garantia, política e contato oficial nunca podem ser autorizados por memória;
- `sharedAcrossAssistants=true` deve ser tratado como escopo deliberado: só compartilhar categorias permitidas e nunca dados que dependam de um assistente/tenant específico;
- memória sensível e valores completos não entram em manifestos Shadow.

## 10. Isolamento e segurança

Controles observados:

- RAG valida `tenant.companyId`, `user.companyId`, assistant pertencente ao tenant e filtra chunks por company/assistant;
- memória filtra por `companyId` e perfil; itens sem escopo adequado não devem ser tratados como disponíveis;
- relações Prisma entre empresa/assistente/conversa usam restrições de integridade;
- Chatwoot tokens são armazenados por mecanismo de configuração/encriptação; não devem chegar ao snapshot;
- ferramentas têm permissões, configuração de assistente, escopo de flow e, no Calendar, escopo de recurso;
- logs têm metadata JSON, mas o conteúdo livre é um risco permanente e precisa de redaction por schema.

Riscos reais a tratar antes/na Fase 6.1B:

1. `memorySharedAcrossAssistants` default true pode compartilhar memória entre assistentes; a política precisa separar categorias compartilháveis de categorias específicas.
2. `AssistantKnowledge.metadata` e conteúdo de chunks são JSON/texto livre; não podem ser copiados integralmente para logs ou manifestos.
3. Flow não possui campos estruturados de autoridade, validade ou categoria factual. A adaptação deve derivar apenas orientação, não verdade.
4. Histórico e respostas antigas do provider continuam disponíveis para continuidade; precisam ser marcados como `CONVERSATION_HISTORY`/`MODEL_GENERATED`.
5. Resultado de ferramenta de escrita possui efeitos externos; V2 deve receber somente plano/metadata em Shadow.
6. O telefone do remetente, payload Chatwoot e anexos não podem ser usados como contato oficial ou evidência comercial.
7. O RAG atual não impõe freshness factual por campo nem versão do documento; score alto não é suficiente para autorizar política.

## 11. Lacunas atuais

- Não existe um envelope comum `SourceEvidence` usado por contexto oficial, RAG, memória e ferramentas.
- `RetrievedItem.sourceType` e `AuthorityPolicy` já existem no V2, mas os tipos de origem não estão alinhados com os modelos V1.
- Não existe catálogo estruturado de categorias factuais e de campos autorizáveis por fonte.
- Não existe política uniforme de `CURRENT/STALE/EXPIRED/UNKNOWN`.
- Conflitos são parcialmente tratados por instrução textual e guard, mas não por decisão persistida com evidências vencedoras/rejeitadas.
- V2 não consulta as fontes reais; seus planos não provam disponibilidade de evidência.
- Manifestos V1 têm muitos campos de contagem e seleção, mas não têm um bundle canônico de proveniência.
- Não há migration necessária para começar a testar o contrato: `AssistantRuntimeLog.metadata`, `sources` e manifestos podem carregar apenas decisões sanitizadas. Uma migration só deve ser considerada se a equipe aprovar um catálogo de evidências durável ou versionamento por campo.

## 12. Plano exato da Fase 6.1B

### Commit 1 — contrato e normalização

Mensagem sugerida: `feat: add canonical factual evidence contracts`

- criar tipos JSON-serializáveis para `SourceEvidence`, `AuthorityDecision`, `RetrievalBundle`, freshness e escopo;
- adaptar/aliasar `RetrievedItem` e `AuthorityPolicy` para evitar duplicação;
- criar validadores de escopo, data, confidence e valores `unknown`;
- definir redaction por schema para IDs, categorias, scores e hashes;
- sem Prisma migration.

### Commit 2 — adapters de fontes V1

Mensagem sugerida: `feat: expose V1 sources as factual evidence`

- adapter do contexto oficial estruturado;
- adapter de flows como `FLOW_GUIDANCE`, sem promover instruções a fato;
- adapter RAG que retorna IDs, score, status, proveniência e conteúdo somente para a etapa autorizada;
- adapter de memória com regras de categoria, expiração e escopo;
- adapter de resultados de ferramenta com timestamp, escopo e categoria;
- testes de tenant/assistant/contact/conversation isolation;
- V1 pode continuar igual em comportamento, com observabilidade adicional sanitizada.

### Commit 3 — decisão canônica de autoridade

Mensagem sugerida: `feat: enforce factual source precedence`

- resolver precedência por categoria;
- detectar conflitos entre estruturado, ferramenta, documento, flow, memória e histórico;
- retornar `SAFE_UNAVAILABLE`/handoff específico quando faltar autoridade;
- integrar a decisão no `RuntimeAuthorityGuard` sem permitir que a categoria do texto gerado substitua a intenção atual;
- incluir no manifest somente IDs, tipos, categorias, scores, freshness e motivos.

### Commit 4 — leitura Shadow somente observacional

Mensagem sugerida: `feat: add shadow factual retrieval decisions`

- permitir que o `RuntimeV2ShadowOrchestrator` construa `RetrievalBundle` real em modo Shadow;
- nenhum provider, tool call, memória write, RAG write ou outbound;
- `RetrievalPlan` continua declarativo; adapters são read-only;
- persistir apenas manifesto sanitizado e estado V2 isolado;
- feature flag OFF por default e allowlist individual.

### Commit 5 — regressão e rollout

Mensagem sugerida: `test: verify authority source isolation and precedence`

- testes unitários de contrato/serialização/freshness/conflito;
- testes PostgreSQL com tenant, assistant, contact, conversation e contextVersion distintos;
- testes com RAG acima/abaixo do threshold e documento desativado;
- testes de memória expirada/compartilhada e proibição de autoridade comercial;
- testes de ferramenta atual versus documento estático;
- teste Chatwoot mockado ponta a ponta com V1 preservado e V2 sem efeitos;
- ativação posterior em Shadow de um único assistente interno.

## 13. Feature flags, rollout e rollback

Rollout recomendado:

1. manter V2 `OFF` durante contratos/adapters;
2. ativar apenas em banco local isolado;
3. ativar `SHADOW` para um assistant allowlisted interno;
4. comparar decisões estruturais V1/V2 sem comparar texto subjetivamente;
5. manter V1 como único provider/tool/outbound;
6. em qualquer erro de isolamento, conflito não sanitizado, timeout ou efeito externo, voltar `RUNTIME_V2_MODE=OFF` e preservar evidências.

Rollback da Fase 6.1B deve ser operacional/configuracional na primeira etapa. Não restaurar banco nem apagar estados; não executar migration sem aprovação específica.

## 14. Decisões que exigem aprovação antes da implementação

1. Quais categorias de `CONTACT_MEMORY` podem ser compartilhadas quando `memorySharedAcrossAssistants=true`.
2. Política de validade para schedule, preços, documentos e confirmações humanas.
3. Se documento oficial precisa de versionamento/validFrom/validUntil no modelo atual ou se metadata aprovada é suficiente inicialmente.
4. Quais ferramentas são consideradas fontes autoritativas por categoria e qual TTL de cada resultado.
5. Se `CUSTOMER_PROVIDED` será um tipo separado de `SESSION_FACT` ou apenas uma proveniência dentro de `SESSION_FACT`.
6. Quais campos de `SourceEvidence` podem aparecer no `AssistantRuntimeLog.metadata`; valores e conteúdo integral devem continuar proibidos.
7. Se o V2 Shadow poderá ler conteúdo RAG completo para validação interna ou somente hashes/IDs/categorias.
8. Critério formal para `STALE` quando uma fonte não possui `validUntil`.
9. Necessidade futura de migration para catálogo de evidências, caso metadata JSON não seja suficiente para consulta operacional.

## 15. Checklist de implementação futura

- [ ] contrato JSON-serializável validado;
- [ ] escopo `companyId` obrigatório em todos os adapters;
- [ ] `assistantId` aplicado quando a fonte é específica do assistente;
- [ ] `contactId`/`conversationId`/`contextVersion` usados quando a evidência é pessoal ou de sessão;
- [ ] histórico separado de autoridade;
- [ ] `MODEL_GENERATED` proibido como fonte factual;
- [ ] RAG com tenant/assistant/status/freshness/proveniência;
- [ ] memória com expiração e política de compartilhamento;
- [ ] ferramentas read-only no Shadow;
- [ ] conflitos registrados sem conteúdo integral;
- [ ] manifesto sem mensagem, prompt, telefone, e-mail, token ou segredo;
- [ ] V1 sem regressão;
- [ ] V2 OFF por default;
- [ ] rollback operacional testado.

## 16. Decisões aprovadas no checkpoint 6.1A.1

O pacote aprovado para a Fase 6.1B1 é conservador e não depende de qualquer tenant, empresa, segmento, produto, flow ou ID específico.

- Contratos JSON versionados, com `contractVersion=1`, sem migration.
- Níveis de autoridade separados de freshness: `NONE`, `CONTEXTUAL`, `AUTHORITATIVE`; e `CURRENT`, `STALE`, `EXPIRED`, `UNKNOWN`.
- A precedência é resolvida por categoria factual; não existe uma ordem global rígida.
- Resultado atual de ferramenta só pode vencer nas categorias explicitamente cobertas pela própria ferramenta.
- Confirmação humana só é válida quando possui categoria, escopo, timestamp e validade compatíveis.
- `MODEL_GENERATED` e `CONVERSATION_HISTORY` nunca são fontes factuais autoritativas.
- `FLOW_GUIDANCE` orienta comportamento/triagem, mas não autoriza fatos isoladamente.
- `CUSTOMER_PROVIDED` é distinto de `SESSION_FACT` e só pode autorizar fatos do próprio cliente dentro da sessão e do escopo.
- Conflito entre evidências autoritativas equivalentes gera decisão segura; nenhuma fonte é escolhida silenciosamente por score.
- Fonte sem validade suficiente fica `UNKNOWN`; `EXPIRED` nunca vence e `STALE` somente vence se uma policy explícita permitir.
- RAG permanece metadata-only no Shadow; memória continua contextual e sem autoridade comercial.
- Compartilhamento de memória entre assistentes fica bloqueado por padrão.
- Nenhuma ferramenta, provider ou outbound é executado pelo V2.
- Persistência fica limitada a manifesto/metadata sanitizada; não há catálogo persistente nesta subfase.
- A feature de evidências futura aceita `OFF` e `SHADOW_METADATA`, com default obrigatório `OFF`; isso não ativa leitura real nesta subfase.
- O V1 permanece sem alteração comportamental e continua responsável pelo provider, ferramentas e outbound.

Escopo exato da 6.1B1:

- contratos e serialização;
- validação de escopo;
- avaliação determinística de freshness;
- redaction por schema;
- policies declarativas por categoria;
- resolvedor puro sem Prisma, provider ou efeitos colaterais;
- adapters fake/in-memory exclusivamente para testes;
- extensão versionada do manifesto;
- configuração tipada com default OFF;
- testes locais e documentação.

Decisões adiadas:

- TTL comercial definitivo por categoria;
- catálogo persistente ou versionamento durável de evidências;
- leitura de conteúdo RAG no Shadow;
- categorias compartilháveis de memória entre assistentes;
- execução futura de ferramentas pelo V2;
- qualquer ativação operacional além de `OFF`.

## 17. Confirmações desta Fase 6.1A

- Nenhum código produtivo foi alterado.
- Nenhuma migration foi criada.
- Nenhum banco foi alterado.
- Nenhum frontend foi alterado.
- Nenhum commit, push ou deploy foi realizado.
- Runtime V2 permaneceu OFF.
- Nenhuma mensagem foi enviada.
- Nenhum dado real, secret, prompt ou conteúdo sensível foi incluído neste documento.

## 18. Implementação da Fase 6.1B2 — contexto oficial estruturado

### Fontes realmente conectadas

O adapter read-only consulta somente `Assistant` filtrado por `assistantId`, `companyId` e status ativo, incluindo a relação `Company` filtrada por status ativo. Não há leitura de RAG, memória, flows, ferramentas, Chatwoot ou provider.

Campos estruturados utilizados:

- `Company.name` para `COMPANY_IDENTITY`;
- campos `Assistant.business*` e `Assistant.websiteUrl` para `ADDRESS` e `OFFICIAL_CONTACT`;
- `Assistant.weeklySchedule` e timezone de assistente/empresa para `BUSINESS_HOURS`;
- `Assistant.updatedAt` e `Company.updatedAt` como início explícito de validade da evidência.

Não existe campo estruturado de exceção de horário no schema atual; `BUSINESS_HOURS_EXCEPTION` permanece ausente e nunca é inferida.

### Fluxo de integração

`RetrievalPlan.officialFactCategories` é convertido para a taxonomia canônica. Para dia e horário específicos, `BUSINESS_HOURS` é solicitado antes de `BOOKING`. O fluxo executa somente quando:

- Runtime V2 está em `SHADOW`;
- `RUNTIME_V2_EVIDENCE_MODE=SHADOW_METADATA`;
- o assistente está na allowlist do Shadow.

O adapter retorna evidências em memória, valida escopo, avalia freshness e passa as candidatas ao `AuthorityEvidenceResolver`. O manifesto persiste apenas IDs, hashes, categorias, status, freshness, contagens e motivos sanitizados.

### Normalização e segurança

Foram adicionados normalizadores genéricos para telefone/WhatsApp, URL, endereço, timezone e horário semanal. Entradas vazias ou inválidas resultam em ausência ou falha sanitizada. Metadata do remetente, histórico e conteúdo livre não entram no adapter.

### Comportamento fail-safe

Falha de leitura retorna `FAILED` ou `PARTIAL`, categorias ausentes e decisão segura. O erro não altera o V1, não bloqueia o endpoint e não executa provider, ferramenta, memória, RAG ou outbound.

### Metadata persistida

O manifesto Shadow inclui `evidenceMode`, versão do contrato, categorias solicitadas, IDs de evidências, contagens por categoria/tipo, decisões vencedoras/rejeitadas, conflitos, categorias ausentes, freshness, falhas de escopo, status/duração do adapter e `redactionApplied`.

### Limitações

- Exceções de horário ainda não possuem fonte estruturada.
- Disponibilidade e agendamento continuam sem adapter de agenda.
- Nenhum conteúdo RAG ou memória é consultado.
- O adapter ainda não deve ser ativado em servidor sem aprovação operacional do modo `SHADOW_METADATA`.

### Plano da Fase 6.1B3

- adapter metadata-only para RAG, preservando tenant, assistant, status, score e proveniência;
- adapter contextual de memória com expiração e compartilhamento bloqueado por padrão;
- testes de conflito entre contexto oficial, RAG e memória;
- integração dessas fontes somente no `RetrievalBundle` Shadow;
- nenhuma execução de provider, ferramenta ou outbound pelo V2.
