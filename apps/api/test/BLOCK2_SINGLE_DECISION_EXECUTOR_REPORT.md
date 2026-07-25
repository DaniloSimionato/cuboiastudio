# Cubo.Chat — Fase 3, Bloco 2

## Decisão terminal e executor únicos no Runtime V1

Baseline do bloco:
`5bad8f16ac944b4ac566f4025e51b825c1111b3d`.

Este bloco altera a estrutura de efeitos terminais do Runtime V1, sem alterar
detecção, precedência, prompt, provider, RAG, guards, preços, BusinessHours,
handoff, pausa ou Runtime V2. A policy observada continua sendo
`V1_COMPATIBILITY_POLICY`.

## Inventário anterior à implementação

### Turnos aceitos

| Caminho alcançável | Efeitos antes do bloco | Reason code preservado | Migração |
|---|---|---|---|
| Provider V1 padrão | persistência da resposta e runtime log, sender e retorno no tail padrão | `PROVIDER_STANDARD` | decisão `PROVIDER_RESPONSE` e executor único |
| Triagem com provider | mesmo tail padrão, com estratégia de triagem | `PROVIDER_TRIAGE_LEGACY` | decisão provider no executor único |
| Preço oficial | renderer determinístico, depois tail padrão | `DETERMINISTIC_PRICE_AUTHORITY` | decisão `DETERMINISTIC_RESPONSE`, autoridade preservada |
| BusinessHours direto | persistência/log próprios, sender próprio e retorno antecipado | `BUSINESS_HOURS_DIRECT` | decisão determinística e executor único |
| Fallback seguro de BusinessHours | mesmo branch direto | `BUSINESS_HOURS_DIRECT_SAFE_FALLBACK_LEGACY` | decisão fallback e executor único |
| Handoff explícito | persistência/log próprios, sender com `handoff=true` e retorno antecipado | `EXPLICIT_HUMAN_HANDOFF_LEGACY` | decisão `LEGACY_HANDOFF_TEXT`, sem efeito operacional novo |
| Flow bypass | conteúdo produzido pelo bypass e tail padrão | `FLOW_BYPASS_LEGACY` | decisão no executor único |
| Fallback determinístico legado | fallback já escolhido e tail padrão | `DETERMINISTIC_FALLBACK_LEGACY` | decisão fallback no executor único |
| Outside business hours legado | resposta já escolhida e tail padrão | `OUTSIDE_BUSINESS_HOURS_LEGACY` | decisão no executor único |
| Reset por keyword | mudança de sessão, resposta própria, sender e log best-effort posterior | `RESET_KEYWORD_LEGACY` | decisão `LEGACY_RESET_RESPONSE`; efeitos de sessão continuam anteriores e declarados como legados |

Os caminhos provider, triagem, preço, flow bypass, fallback e outside business
hours convergem no tail padrão em
`assistant-conversations.service.ts:6727-7070`. BusinessHours, handoff e reset
eram os três owners terminais independentes.

### Rejeições e gates pré-admissão

- eventos Chatwoot inválidos, outgoing, private, automação e IA remota inativa
  continuam encerrados no webhook antes do runtime;
- duplicate no webhook continua retornando `ignored`;
- duplicate localizado dentro do service continua reutilizando os registros
  existentes;
- `expectedContextVersion` obsoleto continua lançando conflito antes da
  persistência do turno;
- pausa ou IA local inativa continuam no processing gate existente, sem
  resposta do assistant e sem outbound;
- falhas antes de existir conteúdo terminal não ganham resposta ou runtime log
  artificiais.

Esses casos não são convertidos em decisões seladas apenas para melhorar uma
contagem.

## Contrato de decisão

O owner tipado é `V1TurnDecision`, versão
`V1_TURN_DECISION_V1`.

O contrato inclui:

- `turnExecutionId`, `contextVersion` e
  `policyVersion=V1_COMPATIBILITY_POLICY`;
- `decisionId`, algoritmo `sha256/v1-turn-decision-v1` e
  `decisionOrdinal=1`;
- tipo, caminho terminal, reason code, strategy, disposição do provider e
  capacidade legada;
- blocos ordenados, conteúdo já produzido e especificação mínima de
  persistência;
- contagem já observada de geração final;
- autoridade comercial selecionada já existente;
- intenção de persistência, runtime log, outbound, sender e efeito de estado;
- metadados mínimos de compatibilidade do retorno legado.

O ID usa uma lista canônica com versão do algoritmo, policy,
`turnExecutionId` e ordinal. Conteúdo, prompt, telefone, token e resposta não
participam.

`V1TurnDecisionSealer` aceita um único `seal` por execução. A decisão e seus
campos JSON-like são congelados, inclusive blocos e `sources`. O service também
mantém um guard de execução por identidade de objeto para impedir uma segunda
execução acidental da mesma decisão na mesma instância.

O contrato preserva um caso legado comprovado de tool flow em que o draft
terminal persistido é uma string vazia e não há outbound. Isso evita
transformar a centralização em correção funcional.

## Executor único

`AssistantConversationsService.executeV1TurnDecision` é o único owner do tail
V1 migrado. Ele:

1. valida a identidade decisão/manifesto;
2. registra os campos da decisão selada;
3. associa `turnExecutionId` e `decisionId` ao inbound;
4. persiste a resposta local com somente essas duas referências;
5. cria o runtime log terminal;
6. usa o sender V1 existente;
7. preserva a revalidação existente de pausa e `contextVersion`;
8. persiste a referência externa quando o caminho anterior já fazia isso;
9. atualiza o resultado observável do outbound;
10. devolve o formato de runtime esperado pelo chamador.

O executor não detecta intenção, não seleciona flow, não executa RAG, não
escolhe autoridade, não chama provider, não altera texto e não implementa
retry.

A busca estática por `sendChatwootOutboundText(` no service encontra somente a
chamada dentro do executor e a definição do sender. Persistências de mensagens
assistant fora do executor são não terminais e preexistentes: mensagem
inicial, importação de histórico e registro intermediário de tool call.

Exceções do sender continuam sendo propagadas nos branches diretos, handoff e
reset, como no baseline. No tail padrão elas continuam sendo registradas e
absorvidas, também como no baseline.

## Manifesto e persistência

O owner canônico continua sendo
`AssistantRuntimeLog.metadata.turnExecutionManifest`.

Campos adicionados:

- `decisionSchemaVersion`;
- `decisionId`;
- `decisionOrdinal`;
- `decisionStatus`;
- `decisionType`;
- `decisionTerminalReasonCode`;
- `decisionExecutorOwner`;
- `decisionExecutorExecutionCount`;
- `decisionPlannedBlockCount`;
- `decisionStateEffect`;
- `decisionOutboundIntended`.

Mensagens terminal assistant recebem apenas `turnExecutionId` e `decisionId`
em `externalPayload`. O manifesto completo não é duplicado.

Outbound continua distinguindo `NOT_ATTEMPTED`, `ACKNOWLEDGED`, `FAILED` e
`UNKNOWN`. Um ack não é chamado de entrega final. Não foi criado outbox,
reconciliador ou retry.

## Duplicate

Um duplicate concluído reutiliza o inbound, runtime log, `turnExecutionId` e
`decisionId` originais. Não sela decisão, não executa o executor, não chama
provider e não cria novo outbound.

Quando o duplicate interno é observado concorrentemente antes de o primeiro
processamento persistir a referência da decisão, o diagnóstico deriva o mesmo
`decisionId` determinístico a partir do `turnExecutionId`; isso não sela nem
executa uma decisão adicional.

## Testes HTTP

O harness usa `dist/main.js`, `AppModule`, bootstrap, controller, webhook
service, runtime, Prisma e Redis reais. Somente Chatwoot e provider são
fronteiras HTTP falsas.

| Controle | Evidência |
|---|---|
| A — saudação | HTTP 201, texto inalterado, final generation 1, uma decisão selada, um runtime log, uma resposta e um outbound com external ID |
| B — dedupe | mesmos IDs de turno/decisão, um manifesto, uma geração final e um outbound |
| C — contextVersion | decisão na versão 2, histórico da versão 1 preservado e não enviado |
| D — formatação | `DETERMINISTIC_PRICE_AUTHORITY`, BRL 1950, `starting_at`, geração final 0 e um outbound |
| E — BusinessHours | `BUSINESS_HOURS_DIRECT`, texto exato do baseline, geração final 0 e um outbound |
| F — handoff legado | `EXPLICIT_HUMAN_HANDOFF_LEGACY`, texto inalterado, IA local ativa, sem team/label/status e um outbound |
| G — provider draft | o controle A prova uma chamada de geração e somente um outbound pertencente ao executor |
| H — sanitização | controles A, D, E e F rejeitam conteúdo inbound, telefone, token, authorization, prompt e knowledge integral |
| I — owner único | todos os manifestos têm owner e execution count 1; contagens persistidas e do fake provam um único tail |

Runtime V2 OFF é invariante transversal dos seis cenários executáveis.

Os cinco gaps continuam como `test.todo`:

1. `atendiemnto`;
2. continuidade de preço para placa-mãe;
3. evidência após o caractere 250;
4. computador lento;
5. handoff operacional.

## Validação local

- Prisma Client gerado contra o schema do baseline;
- build TypeScript fresco aprovado;
- build usado pelo harness:
  `76c5f190560a6e28ae087f53d3526a925e9d9e22a17bb5747e836b359c149739`;
- harness HTTP: 11 testes declarados, 6 aprovados, 0 falhas e 5 `todo`;
- contrato de decisão e manifesto: 8/8 aprovados;
- suíte relacionada de webhook/runtime, preço, BusinessHours, reset, pausa,
  `contextVersion`, outbound e split: 171/171 aprovados;
- suíte combinada de tools e executor: 36/36 aprovada.

## Testes unitários

`v1-turn-decision.test.mjs` cobre:

- ID determinístico e sem PII;
- schema, policy e ordinal;
- imutabilidade profunda;
- efeito de estado legado;
- mesmo ID para o mesmo turno;
- rejeição do segundo selamento;
- compatibilidade do draft vazio de tool flow;
- resultados outbound `NOT_ATTEMPTED`, `ACKNOWLEDGED` e `FAILED`.

## Ajustes de testes legados

`business-hours-direct-deterministic.test.mjs` foi corrigido sem reduzir
cobertura:

- o preço passou de regex permissiva com espaço ASCII para igualdade exata com
  o texto baseline, que usa espaço não separável;
- a fixture de triagem usa a chave atual com `:v1`, alinhada ao isolamento por
  `contextVersion`;
- o preço determinístico exige zero chamadas ao provider; a asserção de
  ausência do estado de triagem no prompt foi mantida no turno posterior de
  garantia, que efetivamente chama provider;
- a falha do sender direto continua propagada e o replay continua sem segundo
  outbound.

## Paridade funcional

| Cenário | Geração final | Embedding | Outbound | Texto/status |
|---|---:|---:|---:|---|
| saudação | 1 | 1 | 1 | inalterado / HTTP 201 |
| dedupe | 1 total | 1 total | 1 total | segundo HTTP 201 ignored |
| contextVersion | 1 | 1 | 1 | inalterado / HTTP 201 |
| formatação | 0 | 1 | 1 | `A formatação custa a partir de R$ 1.950,00.` |
| BusinessHours segunda | 0 | 0 | 1 | `Sim. Aos segundas-feiras atendemos das 08h às 22h.` |
| handoff legado | 0 | 0 | 1 | `Transferindo para um atendente...` |

Tool calls, prompts, modelo, temperatura, guards e payload do sender não foram
alterados. A suíte combinada de ferramentas e executor preserva 36/36 casos,
incluindo 10/10 da integração de ferramentas de calendário.

## Limitações preservadas

- o executor centraliza efeitos, mas não resolve entrega/reconciliação;
- o handoff continua textual e operacionalmente incorreto;
- a pausa ainda possui as fontes de verdade existentes;
- o buffer legado não foi corrigido;
- as cinco falhas funcionais conhecidas continuam abertas;
- Runtime V2 permanece desligado;
- não há schema ou migration nova.
