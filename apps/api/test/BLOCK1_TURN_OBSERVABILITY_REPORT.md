# Cubo.Chat — Fase 3, Bloco 1

## Identidade e observabilidade mínima do turno

Baseline do bloco: `f9f95ebbfc20f61bb8f1e67fdecf17990eb0566e`.

Este bloco instrumenta o Runtime V1 existente. Ele não introduz uma Policy
Unificada, não executa Runtime V2 e não altera roteamento, prompts, preços,
agenda, handoff, pausa, dedupe ou entrega.

## Owner do manifesto

O owner canônico é `AssistantRuntimeLog.metadata.turnExecutionManifest`.

As mensagens inbound e respostas persistidas recebem somente
`turnExecutionId` em `externalPayload` quando esse campo já é usado pelo
caminho. O manifesto não é duplicado nesses registros.

## Contrato

O manifesto tem:

- `schemaVersion=TURN_EXECUTION_MANIFEST_V1`;
- `policyVersion=V1_COMPATIBILITY_POLICY`;
- `turnExecutionId` determinístico com algoritmo
  `sha256/canonical-turn-v1`;
- identidade técnica de empresa, assistant, source, account, inbox, conversa
  externa, external message ID e `contextVersion`;
- snapshot local inicial de `aiActive`, `pausedByHuman` e estado da sessão;
- hash e tamanho do conteúdo normalizado, sem copiar o conteúdo;
- roteamento, RAG e autoridade que o V1 já calculou;
- caminho terminal observado;
- categorias de provider separadas;
- estado de outbound distinto de persistência local.

O hash usa uma lista canônica ordenada de campos; não depende da ordem de
propriedades do objeto e não incorpora texto, telefone, token ou prompt.

Para uma mensagem com external message ID, um retry deduplicado não cria nem
recalcula outro manifesto: ele reutiliza a mensagem inbound e o runtime log
originais. Para mensagens sem ID externo, o ID interno só participa do hash
como fallback técnico.

## Fragmentos e buffer

O bloco não modifica o buffer legado.

- Mensagens não agregadas: `fragmentCount=1` e
  `fragmentIdentityCoverage=COMPLETE`.
- Buffer com um item: `COMPLETE`.
- Buffer com múltiplos DTOs: `FIRST_FRAGMENT_ONLY`.

Essa última marcação é deliberada: o DTO combinado continua carregando a
identidade do primeiro fragmento no Runtime V1. O manifesto não afirma
cobertura integral enquanto o contrato de buffer não for corrigido em bloco
futuro.

## Caminhos terminais instrumentados

| Caminho existente | Reason code do manifesto |
|---|---|
| provider V1 padrão | `PROVIDER_STANDARD` |
| triagem V1 | `PROVIDER_TRIAGE_LEGACY` |
| preço por autoridade | `DETERMINISTIC_PRICE_AUTHORITY` |
| BusinessHours direto | `BUSINESS_HOURS_DIRECT` |
| fallback do BusinessHours direto | `BUSINESS_HOURS_DIRECT_SAFE_FALLBACK_LEGACY` |
| handoff textual legado | `EXPLICIT_HUMAN_HANDOFF_LEGACY` |
| flow bypass | `FLOW_BYPASS_LEGACY` |
| fallback legado/dados ausentes | `DETERMINISTIC_FALLBACK_LEGACY` |
| fora do horário no caminho legado | `OUTSIDE_BUSINESS_HOURS_LEGACY` |
| reset por palavra-chave | `RESET_KEYWORD_LEGACY` |
| conversa pausada ou IA inativa | `BLOCKED_PAUSED` |
| contexto obsoleto bloqueado no sender | `BLOCKED_STALE_CONTEXT` é emitido pelo gate existente; não há novo manifesto porque esse bloqueio não cria um novo turno persistido |
| retry deduplicado | o evento de diagnóstico `DUPLICATE_REUSED` referencia o `turnExecutionId` do manifesto original, sem segundo owner |
| falha antes/outbound | `FAILED_BEFORE_OUTBOUND` e `FAILED_OUTBOUND` permanecem reason codes reservados para os caminhos existentes quando há owner persistido |

`UNCLASSIFIED_LEGACY` é um sinal conservador para qualquer retorno V1 já
alcançável que não possa ser classificado sem inferência.

## Provider e outbound

`provider.finalGeneration` é observado pelo envelope de execução já existente.
As categorias embedding, intent classification e memory extraction não são
inferidas a partir de `providerCount`: onde o V1 atual não fornece uma prova
granular sem invadir os serviços de domínio, o manifesto registra
`NOT_OBSERVED`.

O harness ainda registra as chamadas reais do fake OpenAI-compatible por
categoria. Assim, por exemplo, a formatação prova uma chamada de embedding no
fake e `finalGeneration=0`, enquanto o manifesto não a apresenta como uma
contagem inferida.

Outbound registra planejamento, tentativa, contagem, sender V1, referência
externa retornada e resultado. Uma mensagem local persistida não é tratada como
confirmação de entrega. Não foi criado outbox, retry ou reconciliador.

## Compatibilidade e cobertura

O harness HTTP real valida saudação, dedupe, `contextVersion` e preço de
formatação com o manifesto. Runtime V2 OFF continua invariante transversal.
Os cinco `test.todo` do Bloco 0 permanecem inalterados:

1. erro ortográfico de BusinessHours;
2. continuidade de preço para placa-mãe;
3. evidência depois do caractere 250;
4. resposta comercial para computador lento;
5. handoff operacional.

Buffer concorrente e reconciliação de outbound continuam fora da cobertura
deste bloco.
