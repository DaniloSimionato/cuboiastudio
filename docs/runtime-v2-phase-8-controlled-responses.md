# Runtime V2 — Fase 8.1: respostas candidatas em Shadow

## Objetivo e escopo

O Runtime V2 pode produzir uma resposta textual candidata para comparação interna.
O V1 continua sendo a única origem de resposta ao cliente. A Fase 8.1 não possui
nenhum caminho de outbound, nem executa ferramentas, handoff, Chatwoot, mudança de
`ai_active`, labels, assignment ou status.

## Habilitação

Tudo começa desligado:

- `RUNTIME_V2_RESPONSE_GENERATION_MODE=OFF`
- `RUNTIME_V2_RESPONSE_COMPARISON_MODE=OFF`
- `RUNTIME_V2_RESPONSE_ASSISTANT_IDS=`
- `RUNTIME_V2_RESPONSE_CONVERSATION_IDS=`

Uma candidata somente é elegível quando `RUNTIME_V2_MODE=SHADOW`, o assistente
está também na allowlist geral de Shadow, geração está em `SHADOW` e as allowlists
de assistente e conversa da resposta contêm o escopo exato. Comparação só é
persistida quando seu modo também está em `SHADOW`. Não há reprocessamento de
mensagens já registradas.

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

## Limites e rollback

O rollout deve começar com uma única conversa explicitamente allowlisted e manter
V1 como único outbound. Desligar os dois modos e limpar as allowlists interrompe
novas gerações sem alterar candidatos já persistidos. Uma fase posterior deve
validar comparações reais antes de qualquer decisão sobre resposta V2 ao cliente.
