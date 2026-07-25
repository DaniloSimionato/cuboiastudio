# Fase 3 de 3 — Bloco 4A

## 1. Integridade e isolamento

Baseline obrigatorio deste bloco:

`657aeb0334bb00b9a51f661fcbcf68abc95ce94b`

Esse commit e descendente do commit funcional do Bloco 3B.2
`1c9ad875a9a2e3b03cdcb5ec458e9c3ee223fe05`. A diferenca posterior que formou
o baseline atual alterou somente documentacao; nao alterou codigo, schema ou
migration.

O trabalho esta isolado em:

- worktree:
  `/Users/danilosimionato/Projetos/CuboIAStudio-policy-block4a`;
- branch: `feat/unified-policy-block4a-operational-handoff`.

O repositorio principal nao foi usado como fonte das alteracoes locais nao
relacionadas. Nenhum endpoint, banco, Redis, Chatwoot ou provider de
staging/producao participa do harness. As fronteiras mutaveis de teste sao
loopback. Runtime V2 permanece OFF.

O gate final confirmou o mesmo HEAD e o mesmo snapshot de conteudo do
repositorio principal observado antes do bloco. O harness encerrou API, fakes,
portas e containers locais. Commit e push sao registrados no handoff final,
pois acontecem depois que este relatorio passa a integrar o proprio commit.

## 2. Auditoria do handoff e Chatwoot

Antes do Bloco 4A, o pedido humano explicito:

- era detectado pelo sinal lexical existente;
- encerrava o turno antes de BusinessHours, RAG e provider;
- selava `EXPLICIT_HUMAN_HANDOFF_LEGACY`;
- persistia e enviava incondicionalmente
  `Transferindo para um atendente...`;
- nao alterava `aiActive` ou `pausedByHuman`;
- nao comprovava assignee, team, status ou `ai_active` remoto.

`content_attributes.handoff=true` apenas identificava o outbound. Ele nao era
prova de transicao operacional.

Os contratos Chatwoot comprovados no repositorio sao:

- `GET /api/v1/accounts/:accountId/conversations/:conversationId` para ler a
  conversa;
- `PUT` no mesmo recurso com `{ "ai_active": false }`;
- `POST` no recurso de mensagens para a confirmacao visivel.

Nao existe contrato comprovado neste escopo para criar ou alterar assignee,
team, labels ou status. O helper legado que sincroniza `ai_active` nao atende ao
novo contrato porque executa remote-first, absorve parte dos erros e nao exige
GET de verificacao.

O Bloco 4A preserva a posicao do detector explicito e nao altera Intent Router,
Flow Router, prompt, RAG, preco ou BusinessHours. Caminhos de handoff produzidos
por flow permanecem sob a caracterizacao legada de flow e nao devem ser
confundidos com o novo pedido humano explicito.

## 3. Destino humano

A resolucao do destino usa exclusivamente o estado retornado pelo primeiro GET:

1. assignee ja presente;
2. team ja presente, se nao houver assignee;
3. destino nao resolvido.

Inbox isolada nao e considerada fila humana valida porque o codigo atual nao
possui contrato que comprove essa semantica. Nao existem IDs hardcoded, destino
global inventado ou atribuicao automatica.

Quando nenhum destino e resolvido:

- a IA local permanece bloqueada;
- a operacao fica `RECONCILIATION_REQUIRED`;
- provider nao e chamado;
- nenhuma mensagem de sucesso e persistida;
- nenhum outbound de confirmacao e criado.

O GET posterior a mutacao precisa observar o mesmo destino. Assignee ou team
divergente impede a confirmacao.

## 4. Modelo e migration

Foi adicionada a entidade `AssistantHandoffOperation`, unica por `decisionId` e
por chave idempotente deterministica.

Ela preserva:

- company, assistant, conversa, turno, decisao e `contextVersion`;
- revisao aceita e revisao pos-bloqueio;
- motivo e policy version;
- destino resolvido;
- estado remoto desejado e estado tecnico observado;
- resultados de mutacao e verificacao;
- autorizacao e delivery da confirmacao;
- status, tentativas, timestamps e erros sanitizados.

Estados do contrato:

- `REQUESTED`;
- `LOCALLY_BLOCKED`;
- `REMOTE_PENDING`;
- `REMOTE_CONFIRMED`;
- `CONFIRMATION_PENDING`;
- `COMPLETED`;
- `RECONCILIATION_REQUIRED`;
- `FAILED_TERMINAL`;
- `SUPERSEDED`.

`AssistantOutboundDelivery` recebe somente a referencia opcional
`handoffOperationId`. O payload completo, telefone, token, headers, prompt,
knowledge e response body remoto nao sao duplicados.

A migration `20260725220000_add_assistant_handoff_operation` e aditiva:

- cria a tabela de operacoes;
- adiciona a coluna nullable ao ledger;
- cria uniques, indices e foreign keys;
- nao remove nem renomeia campos;
- nao altera `controlRevision`;
- continua compativel com a aplicacao anterior.

O runner possui validacao de banco vazio e upgrade local a partir do Bloco
3B.2. Essa migration nao foi executada em staging.

## 5. Bloqueio local e revisao

`OPERATIONAL_HUMAN_HANDOFF` declara o state effect
`BLOCK_AI_AND_HANDOFF`. A decisao continua unica, imutavel e sem provider.

Antes de qualquer mutacao remota, o executor persiste a operacao e disputa um
CAS sobre:

- conversa interna;
- company e assistant;
- `contextVersion`;
- `controlRevision`;
- `aiActive=true`;
- `pausedByHuman=false`.

Na mesma transacao:

- `aiActive` passa a `false`;
- `pausedByHuman` passa a `true`;
- `controlRevision` incrementa uma vez;
- timestamp e reason de pausa sao registrados;
- a operacao passa a `LOCALLY_BLOCKED`.

Falha do CAS marca a operacao `SUPERSEDED`, sem mutacao ou confirmacao.

A transicao autorizada de controle pertence somente a essa operacao. O
`ConversationControlTrace` avanca da revisao aceita para a revisao
pos-bloqueio, mantendo o mesmo `contextVersion`. Os checkpoints do Bloco 3A
continuam ativos e qualquer outra mudanca invalida a operacao.

## 6. Mutacao e verificacao remota

Depois do bloqueio local, a sequencia e:

1. resolver a configuracao Chatwoot ativa da mesma company, assistant, account
   e inbox;
2. executar GET da conversa;
3. validar conversation, account e inbox;
4. resolver assignee ou team existente;
5. revalidar o controle local;
6. marcar `REMOTE_PENDING` e incrementar a tentativa;
7. executar PUT somente com `ai_active=false`;
8. executar novo GET, inclusive quando a resposta da mutacao for falha ou
   ambigua;
9. verificar o estado observado.

A verificacao exige:

- IDs externos exatos;
- `ai_active=false`;
- status `open` ou `pending`;
- destino resolvido e preservado.

O 2xx da mutacao, isoladamente, nao autoriza confirmacao. Um 5xx ou timeout que
ocorra depois do efeito remoto pode ser confirmado pelo GET subsequente, sem
segunda mutacao. Se a leitura for inconclusiva ou o efeito nao estiver presente,
a operacao fica parcial e fail-closed.

## 7. Confirmacao e outbound

Somente `REMOTE_CONFIRMED` permite criar a confirmacao visivel.

O executor unico:

- persiste a mensagem terminal;
- associa `turnExecutionId`, `decisionId` e `handoffOperationId`;
- cria o `AssistantOutboundDelivery`;
- move a operacao para `CONFIRMATION_PENDING`;
- usa o mesmo sender V1 e o mesmo ledger/recovery outbound;
- conclui a operacao somente depois do ack conhecido.

A confirmacao preserva o texto de compatibilidade atual. O texto nao e criado
antes da verificacao remota.

O recovery outbound recebeu uma excecao estreita ao controle ativo: somente um
delivery ligado a uma operacao verificada, na revisao pos-bloqueio exata, pode
enviar ou recuperar a confirmacao enquanto a conversa esta
inativa/pausada. Deliveries normais continuam exigindo conversa ativa e nao
pausada.

O coordinator tambem falha fechado para qualquer delivery legado marcado como
handoff que nao possua operacao verificada. Identidade, decisao, policy,
revisao, scope remoto e destino precisam coincidir. A finalizacao do delivery e
da operacao ocorre atomicamente; um ack ja persistido pode reparar
`CONFIRMATION_PENDING` sem novo envio.

Falha do outbound nao desfaz o handoff. A operacao permanece
`CONFIRMATION_PENDING`, e o recovery existente pode restaurar somente a
confirmacao, sem repetir a mutacao remota.

## 8. Falhas, duplicate e concorrencia

Falha de configuracao, destino, mutacao ou verificacao:

- mantem a IA localmente bloqueada;
- nao reativa a conversa;
- nao chama provider;
- nao gera fallback textual;
- nao cria mensagem ou outbound de sucesso;
- registra `RECONCILIATION_REQUIRED` com erro sanitizado.

Duplicate do webhook reutiliza o turno, decisao e operacao existentes. Ele nao:

- bloqueia novamente;
- repete GET/PUT;
- dispara reconciliacao;
- cria outra mensagem;
- cria outro delivery.

Se um reset incrementar `contextVersion` e `controlRevision` enquanto a
mutacao esta em andamento, a verificacao antiga nao atravessa o checkpoint. A
operacao anterior fica `SUPERSEDED` e nao envia confirmacao stale.

Depois do bloqueio local, novos inbounds continuam sujeitos a admissao do
Runtime V1 e nao produzem provider, decisao terminal ou outbound de IA.

O Bloco 4A nao cria scheduler ou coordinator automatico para operacoes parciais.
Esse contrato permanece explicitamente reservado ao Bloco 4B.

## 9. Manifesto e sanitizacao

O owner permanece:

`AssistantRuntimeLog.metadata.turnExecutionManifest`

O resumo de handoff registra:

- versao do contrato;
- operation ID e status;
- tipo e resolucao do destino;
- hash da referencia do destino, sem ID bruto no manifesto;
- revisao aceita e revisao pos-bloqueio;
- resultado do bloqueio local;
- tentativa e resultado da mutacao;
- resultado e timestamp da verificacao;
- decisao, delivery e resultado da confirmacao;
- motivo tecnico de bloqueio.

Mensagens mantem somente referencias minimas. O manifesto nao armazena telefone,
conteudo integral, draft, prompt completo, token, Authorization, headers,
knowledge integral, URL assinada ou response body remoto.

## 10. Arquivos alterados

Producao:

- `apps/api/prisma/schema.prisma`: entidade de handoff e referencia no ledger;
- `apps/api/prisma/migrations/20260725220000_add_assistant_handoff_operation/migration.sql`:
  migration aditiva;
- `apps/api/src/assistant-conversations/operational-handoff.ts`: identidade,
  destino, parser, verificacao e sanitizacao;
- `apps/api/src/assistant-conversations/assistant-conversations.service.ts`:
  decisao operacional, CAS, sequencia remota e confirmacao condicionada;
- `apps/api/src/assistant-conversations/outbound-recovery-coordinator.ts`:
  autorizacao estreita para recovery da confirmacao verificada;
- `apps/api/src/assistant-conversations/turn-execution-manifest.ts`: resumo da
  operacao;
- `apps/api/src/assistant-conversations/v1-turn-decision.ts`: contrato tipado de
  handoff operacional.

Testes:

- `apps/api/test/operational-handoff.test.mjs`;
- `apps/api/test/production-http-harness.test.mjs`;
- `apps/api/test/outbound-recovery.test.mjs`;
- `apps/api/test/business-hours-direct-deterministic.test.mjs`;
- `apps/api/test/helpers/production-fixtures.mjs`;
- `apps/api/test/helpers/stateful-http-fakes.mjs`;
- `apps/api/test/helpers/run-production-http-harness.mjs`.

Documentacao:

- este relatorio;
- `apps/api/test/README.production-http-harness.md`;
- `docs/AI_CONTEXT.md`;
- `docs/AI_RUNTIME_PLAN.md`;
- `docs/CUBOCHAT_INTEGRATION.md`.

## 11. Testes e regressoes

Testes unitarios implementados:

- identidade e plano deterministas, versionados e sem PII;
- precedencia assignee/team e destino nao resolvido;
- parser remoto sanitizado;
- verificacao de scope, estado, status e destino;
- codigos de erro sanitizados;
- decisao unica, imutavel e condicionada a verificacao;
- resumo sanitizado no manifesto.

Cenarios HTTP de handoff implementados pelo entrypoint real:

- assignee existente;
- team existente;
- destino nao resolvido;
- mutation 4xx;
- 5xx sem efeito;
- 5xx depois do efeito;
- timeout depois do efeito;
- timeout inconclusivo;
- falha do outbound da confirmacao;
- duplicate depois da conclusao;
- duplicate durante operacao parcial;
- reset concorrente;
- novo inbound depois do handoff;
- sanitizacao e Runtime V1.

Os controles anteriores de saudacao, dedupe, `contextVersion`, formatacao,
BusinessHours, stale control, claim, classificacao outbound e restart
permanecem na mesma suite.

Quatro gaps funcionais permanecem abertos:

1. `atendiemnto`;
2. continuidade de preco;
3. evidencia depois do caractere 250;
4. computador lento.

O antigo gap de handoff operacional foi convertido em cenarios executaveis. Uma
especificacao `test.todo` separada registra o recovery automatico do Bloco 4B.

## 12. Paridade funcional

As assercoes de paridade preservam, para turnos que nao sao handoff:

- texto;
- status HTTP;
- categorias e contagens de provider;
- mensagem terminal;
- payload e quantidade de outbound;
- external message ID;
- Runtime V1 e Runtime V2 OFF.

Somente o pedido humano explicito muda funcionalmente: ele deixa de produzir
texto incondicional e passa a exigir bloqueio local e verificacao remota.

O gate final confirmou essa paridade: os 27 cenarios HTTP executaveis passaram,
assim como os 254 testes da regressao relacionada. Nenhuma contagem de provider
ou outbound dos controles nao-handoff mudou.

## 13. Validacoes

Validacoes concluidas sem staging:

- Prisma Client gerado e schema validado;
- 45 migrations aplicadas em banco vazio;
- upgrade local do Bloco 3B.2 para 4A validado, incluindo defaults, unique e
  foreign keys;
- build TypeScript fresco concluido;
- SHA-256 combinado do conjunto de artefatos V1 verificado pelo runner:
  `56c4a24b720184b7e843fb4d84c107a48935d9f091d8848d9d6c5c73cd4696af`;
- SHA-256 individual de `dist/main.js`:
  `3b6f23e68dbc6103c45b3949ad8206e8e90e11dd8e71368be9c341a76ac0c4df`;
- timestamp do build: `2026-07-25T19:12:30.876Z`;
- harness HTTP: 32 testes declarados, 27 passed, 0 failed e 5 todo;
- regressao relacionada: 254 passed e 0 failed;
- suite unitaria de handoff: 7 passed e 0 failed;
- concorrencia, reset, outbound recovery e Runtime V2 OFF aprovados;
- `node --check`, `git diff --check` e `git diff --cached --check` aprovados;
- busca por dados reais e credenciais sem ocorrencias; apenas hosts loopback e
  placeholders documentais;
- nenhum processo `dist/main.js`, porta ou container do harness permaneceu
  ativo;
- snapshot do repositorio principal permaneceu identico.

## 14. Commit e push

O commit unico deste bloco usa a mensagem:

`feat: implement verified operational human handoff`

Branch:

`feat/unified-policy-block4a-operational-handoff`

O hash e a confirmacao do push nao sao auto-referenciados dentro do mesmo
commit; ficam no entregavel final e podem ser conferidos diretamente no Git.
Nao houve merge ou deploy.

## 15. Estado final

O gate de conteudo confirmou:

- repositorio principal intacto;
- staging intocado;
- Runtime V2 OFF;
- Bloco 4B nao iniciado.

A limpeza final do worktree e a referencia remota sao verificadas imediatamente
apos o commit/push e registradas no entregavel final.

O contrato desta implementacao nao ativa recovery automatico de handoff nem
antecipa o Bloco 4B.
