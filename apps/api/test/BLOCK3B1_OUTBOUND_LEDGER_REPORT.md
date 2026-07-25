# Fase 3 — Bloco 3B.1: ledger durável de outbound

## 1. Integridade e isolamento

- baseline: `d22a1dd75dfbbf20c6316f23a9c08ae03eed2361`;
- branch: `feat/unified-policy-block3b1-outbound-ledger`;
- worktree: `/Users/danilosimionato/Projetos/CuboIAStudio-policy-block3b1`;
- PostgreSQL, Redis, Chatwoot fake, provider fake e API escutaram somente em
  loopback e foram encerrados pelo harness;
- nenhuma chamada foi feita a staging, Chatwoot real ou provider real;
- Runtime V2 permaneceu explicitamente `OFF`;
- nenhuma correção funcional dos cinco gaps foi implementada.

O repositório principal foi tratado somente com comandos Git de leitura. Suas
alterações locais preexistentes não foram copiadas, alteradas ou incorporadas.

## 2. Auditoria do outbound anterior

Antes deste bloco, a ordem efetiva no executor V1 era:

1. decisão selada;
2. persistência da mensagem terminal e do runtime log;
3. checkpoint local `PRE_OUTBOUND`;
4. chamada direta ao sender Chatwoot;
5. atualização best-effort do external message ID;
6. atualização do manifesto.

Não existia model equivalente a outbox, delivery, dispatch, tentativa externa
ou idempotency key de outbound. `AssistantConversationMessage.externalMessageId`
representava apenas uma referência obtida após o envio. Consequentemente,
`PENDING`, tentativa em andamento, falha repetível e resultado ambíguo eram
indistinguíveis depois da perda da memória do processo.

O duplicate já interrompia o segundo processamento lógico no webhook, mas não
possuía um registro durável do outbound original. A nova entidade foi necessária
porque nenhum campo existente podia representar intenção, claim e resultado sem
confundir persistência local com ack remoto.

## 3. Modelo e migration

Foi adicionada somente a entidade `AssistantOutboundDelivery`, sem modificar ou
remover campos existentes. Ela contém:

- identidade: empresa, assistant, conversa, mensagem terminal,
  `turnExecutionId`, `decisionId`, `blockOrdinal`, idempotency key e policy;
- controle esperado: `contextVersion` e `controlRevision`;
- payload sanitizado: sender, SHA-256 e tamanho, sem cópia do conteúdo;
- estado: status, contador, owner do claim, timestamps, external message ID e
  erro classificado/sanitizado;
- auditoria: `createdAt` e `updatedAt`.

A migration `20260725140000_add_assistant_outbound_delivery` é aditiva. A FK
owner para a mensagem usa `ON DELETE CASCADE`, preservando a compatibilidade de
rollback da aplicação anterior, que não conhece o ledger. As demais FKs
continuam restritivas segundo o ownership existente.

Validações locais:

- aplicação das 43 migrations em banco vazio;
- upgrade em banco separado com as migrations até o Bloco 3A e fixtures já
  existentes;
- defaults `PENDING` e `attemptCount=0`;
- unicidade por `idempotencyKey`;
- unicidade por `(decisionId, blockOrdinal)`;
- FK para a mensagem terminal;
- exclusão legada de mensagem remove o ledger owner por cascade.

Nenhuma migration foi executada em staging.

## 4. Identidade e unicidade

O contrato `ASSISTANT_OUTBOUND_DELIVERY_V1` cria uma idempotency key
determinística a partir da serialização ordenada de:

1. algoritmo `sha256/assistant-outbound-delivery-v1`;
2. `V1_COMPATIBILITY_POLICY`;
3. `turnExecutionId`;
4. `decisionId`;
5. `blockOrdinal`.

Texto, telefone, timestamp, resposta do provider e external message ID não
participam da identidade. O conteúdo é representado no ledger somente por
fingerprint SHA-256 e tamanho. O contrato aceita múltiplos ordinais sem ativar
ou alterar o split atual.

## 5. Estados de delivery

- `PENDING`: intenção persistida, sem tentativa;
- `SENDING`: claim atômico obtido por uma execução;
- `ACKNOWLEDGED`: resposta HTTP de sucesso conhecida; não significa entrega ao
  destinatário final;
- `FAILED_RETRYABLE`: falha HTTP/transport classificada como repetível, sem
  retry neste bloco;
- `FAILED_TERMINAL`: falha permanente conhecida;
- `UNCERTAIN`: a fronteira pode ter aceitado a operação, mas não houve ack
  seguro;
- `CANCELLED_STALE`: controle local divergiu antes da chamada.

Nenhum estado é denominado `DELIVERED`.

## 6. Claim e execução

O executor único continua sendo o proprietário dos efeitos terminais. Na mesma
transação que persiste mensagem e runtime log, ele cria um delivery `PENDING`
para cada bloco planejado. Se isso falhar, o sender não é chamado.

Depois da transação:

1. executa o checkpoint `PRE_OUTBOUND` com lock local;
2. tenta `PENDING → SENDING` com status, versão e revisão esperados;
3. somente o claim vencedor recebe um token e chama o sender existente;
4. a transição final exige `SENDING` e o mesmo token;
5. manifesto e external message ID são atualizados pelo contrato já existente.

Se o checkpoint falhar antes do claim, o delivery vira `CANCELLED_STALE` com
zero tentativa. Se o sender detectar stale após o claim, a mesma linha também
é cancelada. Não há segunda decisão, fallback textual ou segundo outbound.

O payload, endpoint, sender e tratamento HTTP público permanecem os mesmos.
Somente a classificação observável foi enriquecida: 4xx permanente,
5xx/repetível, falha comprovada antes de conexão e fechamento ambíguo.

## 7. Duplicate e restart

O segundo webhook com o mesmo external message ID reutiliza o processamento,
decisão, delivery e idempotency key originais. Ele não executa claim, provider
ou sender novamente, inclusive quando o delivery está `FAILED_RETRYABLE` ou
`UNCERTAIN`.

Os testes encerram e iniciam novamente `dist/main.js` e comprovam que:

- `ACKNOWLEDGED` permanece com contador 1;
- `PENDING` permanece com contador 0 e sem owner;
- nenhum outbound é criado automaticamente no restart.

Não foi criado worker. Recuperação de `PENDING`, lease de `SENDING`, retry de
`FAILED_RETRYABLE` e reconciliação de `UNCERTAIN` pertencem ao Bloco 3B.2.

## 8. Manifesto e sanitização

O owner canônico continua
`AssistantRuntimeLog.metadata.turnExecutionManifest`. A seção outbound recebe
somente referências resumidas:

- versão do delivery;
- delivery ID e idempotency key técnica;
- ordinal;
- versão e revisão esperadas;
- status e contador;
- timestamps de tentativa e ack;
- external message ID;
- classe e código de erro sanitizados.

O manifesto e o ledger não armazenam telefone, texto integral duplicado,
headers, Authorization, token, prompt, knowledge integral, response body ou
URL assinada. A mensagem terminal continua contendo o texto pelo contrato
preexistente; ela recebe a referência relacional do ledger, não uma cópia do
manifesto.

## 9. Arquivos do bloco

Produção e persistência:

- `apps/api/prisma/schema.prisma`: model e relações;
- `apps/api/prisma/migrations/20260725140000_add_assistant_outbound_delivery/migration.sql`:
  migration aditiva;
- `apps/api/src/assistant-conversations/outbound-delivery.ts`: identidade,
  fingerprint, status e plano tipado;
- `apps/api/src/assistant-conversations/assistant-conversations.service.ts`:
  criação transacional, claim, transição final e integração no executor;
- `apps/api/src/assistant-conversations/turn-execution-manifest.ts`: referências
  resumidas do delivery.

Harness, testes e documentação:

- `apps/api/test/production-http-harness.test.mjs`;
- `apps/api/test/outbound-delivery.test.mjs`;
- `apps/api/test/outbound-external-reference.test.mjs`;
- `apps/api/test/helpers/run-production-http-harness.mjs`;
- `apps/api/test/helpers/stateful-http-fakes.mjs`;
- `apps/api/test/helpers/production-fixtures.mjs`;
- `apps/api/test/chatwoot-webhook-and-runtime.test.mjs`;
- `apps/api/test/business-hours-direct-deterministic.test.mjs`;
- `apps/api/test/conversation-reset.test.mjs`;
- `apps/api/test/split-response-style.test.mjs`;
- `apps/api/test/README.production-http-harness.md`;
- este relatório.

As alterações nos testes legados adicionam somente o novo double de persistência
ou a limpeza explícita do novo filho relacional. Nenhuma asserção funcional foi
removida ou relaxada.

## 10. Testes e regressões

Resultado final do harness HTTP:

- 19 testes declarados;
- 14 cenários executáveis aprovados;
- 0 falhas;
- 5 `test.todo`.

Os controles incluem ack normal, preço determinístico, duplicate, claim
concorrente, stale, 4xx, 5xx, timeout ambíguo, restart, sanitização e handoff
legado. Runtime V2 OFF é invariante transversal, não um cenário artificial.

Suíte relacionada executada pelo mesmo runner:

- 221 aprovados;
- 0 falhas;
- 0 `todo`.

Ela cobre webhook/runtime, canonical inbound, preço, BusinessHours, contexto
oficial, reset, CAS, outbound, split preexistente, tools, decisão, manifesto e
runtime stabilization.

Os cinco gaps permanecem `todo`:

1. `atendiemnto`;
2. continuidade de preço;
3. evidência após o caractere 250;
4. computador lento;
5. handoff operacional.

## 11. Paridade e limites

Nos controles sem concorrência, foram preservados:

- texto e ordem visual;
- status HTTP 201;
- payload e sender Chatwoot;
- um outbound;
- external message ID;
- quantidade de embeddings, classificações, final generation, memory e tools;
- decisão única, mensagem terminal e runtime log;
- comportamento textual legado do handoff.

O bloco impede apenas claim/outbound concorrente ou duplicate. Ele não
implementa retry, reconciliador, lease, idempotency marker remoto, handoff,
assignment, labels, status Chatwoot ou nova leitura remota. Um ack do POST
continua sendo apenas `ACKNOWLEDGED`.

## 12. Evidência de build e lifecycle

O build fresco usado pela validação final:

- SHA-256:
  `5c68c168ec8b5fe2e6d06fe349231eab9f07dd23b99602bc6507c2223d3543af`;
- timestamp: `2026-07-25T13:30:20.911Z`.

Após o runner:

- processo `dist/main.js` ausente;
- portas aleatórias do PostgreSQL e Redis fechadas;
- fakes HTTP encerrados;
- containers do harness removidos.
