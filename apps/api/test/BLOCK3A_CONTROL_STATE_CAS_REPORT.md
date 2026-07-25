# Fase 3 — Bloco 3A: controle local, revisão monotônica e checkpoints CAS

## Base e isolamento

- baseline aprovado: `2aa8bb964a6c277f0a97ea3f638532d8c831fa8e`;
- branch: `feat/unified-policy-block3a-control-state-cas`;
- worktree: `/Users/danilosimionato/Projetos/CuboIAStudio-policy-block3a`;
- Runtime V1 preservado com policy `V1_COMPATIBILITY_POLICY`;
- Runtime V2 permaneceu desligado;
- nenhuma chamada a staging, Chatwoot real ou provider real foi executada;
- PostgreSQL e Redis utilizados pelos testes foram locais e descartáveis.

O repositório principal foi tratado somente com inspeções Git read-only. As
alterações locais preexistentes de integração OpenAI não foram copiadas,
restauradas, formatadas ou incorporadas ao worktree.

## Inventário de estado e writers

Não havia no model `AssistantConversation` um token monotônico de controle. O
campo `revision` encontrado pertence exclusivamente ao estado do Runtime V2 e
não representa `aiActive`, `pausedByHuman` ou `currentContextVersion` do
Runtime V1. Reutilizá-lo criaria dependência com um runtime que deve continuar
desligado.

Writers V1 observados:

| Writer | Estado alterado antes do bloco | Proteção anterior | Contrato do Bloco 3A |
|---|---|---|---|
| criação de conversa Chatwoot/manual | valores iniciais/defaults | transação somente no fluxo manual | revisão começa em zero pelo default |
| `setExternalConversationAiActive` | `aiActive`, timestamps e motivo | update local sem CAS após PUT remoto | CAS pela revisão capturada e incremento atômico |
| reset administrativo silencioso | `currentContextVersion`; opcionalmente `aiActive` e `pausedByHuman` | CAS por `currentContextVersion` | preserva o CAS e incrementa versão/revisão no mesmo `updateMany` |
| reset por keyword legado | `currentContextVersion` e nova sessão | update e create separados | CAS por versão/revisão e sessão na mesma transação |
| retomada | delega para `setExternalConversationAiActive` | mesmo contrato anterior | herda o CAS local |
| handoff legado | nenhum campo de controle | não operacional | permanece sem mutação |
| webhook Chatwoot | usa `ai_active` remoto como gate de ingresso | não sincroniza o controle local | comportamento preservado |

Não foi encontrado writer V1 que pause diretamente com
`pausedByHuman=true`. O campo continua participando de snapshots e
checkpoints; futuros writers deverão obrigatoriamente incrementar a revisão na
mesma operação.

## Schema e migration

Foi adicionada somente a coluna:

```text
AssistantConversation.controlRevision Int @default(0)
```

A migration é aditiva, não renomeia ou remove campos e usa `NOT NULL DEFAULT
0`. O código antigo continua ignorando a coluna. Foram validados:

- banco local vazio com todas as 42 migrations;
- banco local com schema da baseline e fixture existente;
- aplicação posterior da migration preservando versão, flags e atribuindo
  revisão zero à linha existente.

Nenhuma migration foi executada em staging.

## Contrato de controle

`ConversationControlSnapshot` é versionado e imutável. Ele contém somente
identificadores técnicos e estado local:

- conversa interna;
- `currentContextVersion`;
- `controlRevision`;
- `aiActive`;
- `pausedByHuman`;
- estado derivado;
- timestamp, origem e motivo da leitura.

Estados derivados: `ACTIVE`, `PAUSED`, `INACTIVE`, `STALE_CONTEXT` e
`UNKNOWN`. A comparação invalida o turno quando muda qualquer identificador,
versão, revisão ou booleano. A revisão monotônica detecta ABA: mesmo que os
booleanos retornem aos valores anteriores, a execução antiga não volta a ser
válida.

PostgreSQL é a autoridade operacional local deste bloco. Divergência remota que
não atualize o banco local ainda não é detectável. Não foram adicionados
polling, leituras extras no Chatwoot ou transições remotas.

## Checkpoints

| Checkpoint | Posição | Efeito ao bloquear |
|---|---|---|
| `ADMISSION` | antes de roteamento, RAG ou provider | não admite continuidade stale |
| `PRE_PROVIDER` | dentro das estratégias V1, imediatamente antes de cada geração real | provider não é chamado novamente |
| `PRE_SEAL` | antes de selar cada decisão alcançável | draft retornado é descartado |
| `PRE_EFFECTS` | dentro da transação do executor, com lock da conversa | nenhuma resposta terminal ou efeito é persistido |
| `PRE_OUTBOUND` | no executor e novamente no sender V1 imediatamente antes do envio | outbound permanece `NOT_ATTEMPTED` |

O checkpoint pré-provider não bloqueia embeddings ou classificação semântica
já iniciados, conforme o escopo aprovado. Ele foi instalado no seam de
geração existente; o service não passou a executar geração diretamente. Na
triagem, uma falha de controle acontece fora do tratamento de erro do provider,
portanto não é contida como falha de modelo e não dispara a segunda tentativa.

Bloqueios não geram texto, fallback, segunda decisão ou novo provider. O
runtime log terminal é `SKIPPED`, sem mensagem do assistant e sem conteúdo do
draft descartado.

## Manifesto

O owner canônico continua sendo
`AssistantRuntimeLog.metadata.turnExecutionManifest`. A seção `control`
registra:

- schema de controle;
- snapshot aceito e snapshot esperado atual;
- checkpoints com timestamp e resultado;
- revisão/versão esperadas e observadas;
- estado observado e motivo da divergência;
- transições locais autorizadas;
- motivo de bloqueio;
- decisão `PENDING`, `EXECUTED` ou `DISCARDED`;
- autorização de outbound.

Mensagens continuam guardando apenas `turnExecutionId` e `decisionId`. O
manifesto não duplica conteúdo inbound, draft, prompt ou knowledge integral e
não contém telefone, token ou headers.

## Paridade funcional

Sem concorrência, os controles preservaram:

| Cenário | Geração final | Embedding | Outbound | Resultado |
|---|---:|---:|---:|---|
| saudação | 1 | 1 | 1 | mesmo texto e HTTP 201 |
| dedupe | 1 total | 1 total | 1 total | mesma decisão reutilizada |
| `contextVersion` | 1 | 1 | 1 | histórico antigo excluído |
| formatação | 0 | 1 | 1 | BRL 1950, `starting_at` |
| BusinessHours reconhecido | 0 | 0 | 1 | texto baseline |
| handoff legado | 0 | 0 | 1 | texto legado; nenhuma transição operacional |

Somente cenários com alteração concorrente de controle passam a descartar o
draft, impedir efeitos ou bloquear outbound.

## Testes e evidências locais

- harness HTTP: 14 testes declarados, 9 aprovados, 0 falhas e 5 `todo`;
- webhook/runtime legado: 73/73;
- suíte relacionada de preço, BusinessHours, reset, pausa, `contextVersion`,
  outbound, tools, decisão e manifesto: 141/141;
- contratos de snapshot/decisão/manifesto: aprovados;
- reset administrativo: incremento único de versão/revisão, zero provider,
  zero outbound e nenhuma mensagem artificial;
- CAS concorrente: um vencedor, uma rejeição stale e um único incremento;
- pausa durante provider: draft descartado, zero resposta terminal e zero
  outbound;
- reset durante provider: versão/revisão antigas invalidadas e zero outbound
  antigo;
- mudança antes do outbound: decisão única preservada e sender não chamado;
- readiness do PostgreSQL do harness confirmada com `SELECT 1` no banco
  nomeado; `pg_isready` isolado podia responder antes da criação desse banco;
- migration validada em banco vazio e sobre fixture da baseline;
- build fresco do harness:
  `be68121ab77f62ff30ef2a8d778defddc4dda214063b7ade523c4123935bec36`.

Os cinco gaps continuam visíveis como `test.todo`:

1. `atendiemnto`;
2. continuidade de preço para placa-mãe;
3. evidência após o caractere 250;
4. computador lento;
5. handoff operacional.

## Limitações preservadas

- não existe outbox, retry novo ou reconciliação de entrega;
- o handoff continua textual e explicitamente legado;
- mudanças remotas sem reflexo local não são vistas pelos checkpoints;
- o buffer legado não foi corrigido;
- embeddings e classificação já em curso não são cancelados;
- Runtime V2 não participa do caminho;
- os cinco gaps funcionais não foram corrigidos.
