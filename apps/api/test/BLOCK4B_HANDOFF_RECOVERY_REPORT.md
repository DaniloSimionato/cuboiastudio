# Fase 3 de 3 — Bloco 4B

## 1. Integridade e isolamento

Baseline aprovado:

`670bb08cb97d386629f6fc71623018362be0992f`

Ambiente isolado:

- worktree:
  `/Users/danilosimionato/Projetos/CuboIAStudio-policy-block4b`;
- branch: `feat/unified-policy-block4b-handoff-recovery`;
- Runtime V1 preservado com policy `V1_COMPATIBILITY_POLICY`;
- Runtime V2 permanece OFF;
- PostgreSQL, Redis, Chatwoot fake e provider fake dos testes são locais e
  descartáveis;
- a implementação não depende de Chatwoot, provider ou banco de staging.

Este relatório descreve o conteúdo validado do Bloco 4B:

- gate funcional e de regressão: **APROVADO**;
- harness HTTP: **28 passed, 0 failed e 4 `todo`**;
- regressão relacionada: **286 passed e 0 failed**;
- commit e push: evidenciados no histórico Git e no entregável final, pois um
  commit não pode conter o próprio hash sem reescrever seu conteúdo.

Nenhuma afirmação neste documento significa deploy ou execução em staging.

## 2. Auditoria das janelas de falha

O Bloco 4A já persistia a operação e bloqueava a IA antes da fronteira
Chatwoot. O Bloco 4B trata as janelas em que o processo pode parar depois
disso:

| Janela persistida | Evidência disponível | Ação segura no recovery | Ação proibida |
|---|---|---|---|
| `REQUESTED`, antes do bloqueio | decisão e operação originais | repetir somente o CAS local original | mutação ou confirmação antes do CAS |
| `LOCALLY_BLOCKED`, sem attempt remoto | revisão pós-bloqueio e ausência de fronteira | GET remoto; primeira mutation somente com destino e controle válidos | assumir que o remoto ainda está ativo |
| claim expirado antes da fronteira | attempt sem `boundaryStartedAt` | liberar claim, aplicar backoff e manter safety comprovada | loop imediato |
| claim expirado depois da fronteira | attempt com `boundaryStartedAt` | GET e reconciliação | repetir mutation diretamente |
| `REMOTE_PENDING` após 2xx, 5xx ou timeout | mutation iniciada, resultado insuficiente | GET primeiro | usar resposta da mutation como prova |
| GET de verificação falhou | estado remoto inconclusivo | preservar reconciliação e tentar nova leitura elegível | enviar confirmação |
| remoto correto antes da persistência local | leitura positiva do recurso exato | persistir `REMOTE_CONFIRMED` sem nova mutation | repetir PUT |
| `REMOTE_CONFIRMED` sem confirmação local | operação e decisão originais | criar/reutilizar confirmação determinística uma vez | criar nova decisão ou chamar provider |
| `CONFIRMATION_PENDING` | mensagem e delivery existentes | delegar ao recovery outbound | repetir mutation de handoff |
| ack remoto do outbound sem conclusão local | attempt/delivery existentes | reconciliar pelo ledger existente | criar outro texto ou delivery |
| reset ou revisão divergente | `contextVersion` ou `controlRevision` mudou | `SUPERSEDED` | atravessar a nova versão |

A ausência do estado desejado em uma leitura não prova, isoladamente, que é
seguro sobrescrever uma intervenção humana posterior.

## 3. Recovery safety

`HandoffRecoverySafety` é uma dimensão diferente do status da operação:

- `PROVEN_SAFE`: nenhuma mutation capaz de produzir efeito remoto cruzou a
  fronteira;
- `VERIFY_REMOTE_FIRST`: a mutation pode ter produzido efeito; GET é
  obrigatório antes de qualquer avanço;
- `NOT_RETRYABLE`: mutation automática proibida;
- `UNKNOWN`: evidência histórica insuficiente; mutation automática proibida.

Classificações principais:

- falha antes da serialização/fronteira pode ser `PROVEN_SAFE`;
- `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN` e connect timeout somente são
  seguros quando observados antes da fronteira;
- 4xx permanente é terminal e `NOT_RETRYABLE`;
- 408, 425, 429, 5xx, timeout e socket ambíguo não provam ausência de efeito;
- target remoto diferente entre GET e mutation falha fechado;
- mutation com safety `UNKNOWN` nunca é repetida automaticamente.

## 4. Lease e attempts

`AssistantHandoffOperation` mantém o estado agregado:

- `attemptCount` e `maxAttempts` para o budget de mutation;
- `attemptOwner`;
- `claimStartedAt`;
- `claimExpiresAt`;
- `nextEligibleAt`;
- `remoteBoundaryStartedAt`;
- safety e resultado resumido da reconciliação.

`AssistantHandoffAttempt` preserva o histórico por tentativa:

- número único por operação;
- owner;
- início e expiração do lease;
- entrada na fronteira;
- término;
- mutation e verificação;
- safety;
- status HTTP e erros sanitizados;
- fingerprint técnico do estado observado, quando disponível.

Dois workers disputam o mesmo claim. Somente o owner vigente pode atravessar a
fronteira e finalizar a tentativa. Lease expirado antes da fronteira pode
voltar a ser elegível depois do backoff; lease expirado depois da fronteira
exige reconciliação.

## 5. Coordinator

`HandoffRecoveryCoordinator` opera apenas sobre
`AssistantHandoffOperation` existente. Ele não reconhece intenção, não chama
provider, não cria decisão e não altera conteúdo comercial.

Responsabilidades:

- selecionar operações parciais elegíveis;
- revalidar a conversa, `contextVersion`, `controlRevision`, `aiActive` e
  `pausedByHuman`;
- disputar e finalizar lease;
- executar GET remoto antes de mutation recuperada;
- executar a primeira mutation ainda não iniciada ou retry comprovadamente
  seguro;
- reconciliar mutation ambígua;
- persistir estado remoto confirmado;
- criar ou reutilizar a confirmação faltante;
- delegar exclusivamente ao recovery outbound quando já existe delivery;
- atualizar o resumo sanitizado do manifesto.

O endpoint remoto é resolvido novamente por execução. Um fingerprint técnico
impede a mutation quando configuração, account, inbox, conversa ou base URL
mudam entre leitura e escrita.

## 6. Matriz de estados

| Estado | Ação automática permitida |
|---|---|
| `REQUESTED` | CAS local original; sem mutation se o controle divergiu |
| `LOCALLY_BLOCKED` | GET; primeira mutation apenas se nunca iniciada e segura |
| `REMOTE_PENDING` | GET primeiro; mutation somente com safety comprovada |
| `RECONCILIATION_REQUIRED` | GET primeiro; sem retry cego |
| `REMOTE_CONFIRMED` | criar ou reutilizar confirmação determinística |
| `CONFIRMATION_PENDING` | recovery do delivery existente |
| `COMPLETED` | no-op |
| `FAILED_TERMINAL` | no-op automático |
| `SUPERSEDED` | no-op automático |

O budget limita mutations. Leituras de reconciliação ainda podem diagnosticar
o estado depois de o budget de mutation acabar.

## 7. Reconciliação remota

Toda operação ambígua começa por GET da conversa exata. A verificação exige:

- conversation, account e inbox esperados;
- `ai_active=false`;
- status `open` ou `pending`;
- assignee ou team humano válido.

Se o destino mudou por intervenção humana, o novo destino pode ser aceito
somente quando continua válido, a IA remota permanece inativa e o scope é o
mesmo. A intervenção é registrada, sem restaurar o destino anterior.

Destino removido ou scope/status divergente mantém a operação inconclusiva.
Inbox sem assignee ou team não é promovida por presunção a fila humana.

## 8. Confirmação e outbound

Depois de `REMOTE_CONFIRMED`, a confirmação usa um contrato determinístico:

- mesmo `turnExecutionId`;
- mesmo `decisionId`;
- mesmo `contextVersion`;
- ordinal `1`;
- texto de compatibilidade versionado.

A criação é transacional e idempotente:

- revalida controle local e verificação remota;
- reutiliza delivery já existente para a mesma decisão/ordinal;
- caso não exista, cria uma mensagem terminal e um
  `AssistantOutboundDelivery` únicos;
- move a operação para `CONFIRMATION_PENDING`;
- cria ou atualiza o runtime log e o manifesto sem chamar provider.

O coordinator não implementa outro sender ou ledger. Ele delega ao
`OutboundRecoveryCoordinator`. Delivery `UNCERTAIN` não produz segundo texto
nem segundo POST. Ack do POST continua significando apenas
`ACKNOWLEDGED`, não entrega final ao usuário.

## 9. Reset, duplicate e concorrência

- reset ou mudança de revisão torna a operação `SUPERSEDED`;
- recovery nunca reativa a IA nem remove `pausedByHuman`;
- duplicate do webhook reutiliza a operação e não dispara o coordinator;
- novos inbounds em conversa bloqueada não chamam provider nem produzem
  resposta;
- dois workers resultam em um lease e uma ação externa;
- uma operação concluída é no-op em varreduras posteriores;
- nenhuma janela de recovery cria uma segunda decisão.

## 10. Feature flag

O runner periódico é registrado no módulo, mas permanece:

```env
HANDOFF_RECOVERY_ENABLED=false
```

por padrão.

Quando habilitado em ambiente controlado, ele:

- usa intervalo e batch configuráveis;
- impede sobreposição;
- usa timer com `unref`;
- encerra o timer e aguarda a execução ativa no shutdown.

Mesmo com a flag `true`, a execução automática é bloqueada em `staging` e
`production` neste bloco. A implementação não altera `.env` real e não ativa
recovery em nenhum ambiente remoto.

## 11. Manifesto e sanitização

O owner canônico continua:

`AssistantRuntimeLog.metadata.turnExecutionManifest`

O resumo de recovery registra:

- schema da operação e da tentativa;
- número da tentativa;
- fingerprint do lease owner;
- início e expiração;
- safety e elegibilidade;
- próxima data elegível;
- estado e evidência de reconciliação;
- intervenção externa observada;
- confirmação criada ou reutilizada;
- delivery usado;
- resultado e motivo técnico de bloqueio.

Não são armazenados no manifesto:

- telefone;
- conteúdo integral;
- prompt;
- knowledge integral;
- token;
- headers;
- response body remoto;
- owner bruto do lease.

## 12. Schema e migration

A migration `20260725230000_add_handoff_recovery_safety` é exclusivamente
aditiva.

Ela:

- adiciona referências técnicas e campos de recovery à operação existente;
- adiciona safety, lease, backoff, budget e auditoria agregada;
- cria `AssistantHandoffAttempt`;
- cria unique `(operationId, attemptNumber)`, índices e FK com cascade;
- mantém defaults compatíveis com a aplicação anterior;
- não altera nem remove `controlRevision`;
- não executa backfill destrutivo.

Validações executadas:

- banco local vazio: **APROVADO**;
- upgrade local a partir do Bloco 4A: **APROVADO**;
- defaults, unique, FK e cascade: **APROVADOS**;
- staging: **NÃO EXECUTADO**.

## 13. Arquivos alterados

Persistência e runtime:

- `apps/api/prisma/schema.prisma`;
- `apps/api/prisma/migrations/20260725230000_add_handoff_recovery_safety/migration.sql`;
- `apps/api/src/assistant-conversations/handoff-recovery.ts`;
- `apps/api/src/assistant-conversations/handoff-recovery-coordinator.ts`;
- `apps/api/src/assistant-conversations/handoff-recovery-runner.ts`;
- `apps/api/src/assistant-conversations/assistant-conversations.service.ts`;
- `apps/api/src/assistant-conversations/assistant-conversations.module.ts`;
- `apps/api/src/assistant-conversations/turn-execution-manifest.ts`;
- `apps/api/src/config/env.ts`;
- `.env.example`.

Testes e harness:

- `apps/api/test/handoff-recovery-contract.test.mjs`;
- `apps/api/test/handoff-recovery-runner.test.mjs`;
- `apps/api/test/handoff-recovery.test.mjs`;
- `apps/api/test/production-http-harness.test.mjs`;
- helpers e fixtures do harness estritamente necessários.

Documentação:

- este relatório;
- `docs/AI_CONTEXT.md`;
- `docs/AI_RUNTIME_PLAN.md`;
- `docs/CUBOCHAT_INTEGRATION.md`.

## 14. Testes e regressões

Cobertura implementada:

- recovery de `REQUESTED` e `LOCALLY_BLOCKED`;
- mutation aplicada antes de interrupção, 5xx ou timeout;
- ambiguity inconclusiva sem segunda mutation;
- retry `PROVEN_SAFE`, backoff e budget;
- restart em `REMOTE_CONFIRMED`;
- `CONFIRMATION_PENDING` e delivery `UNCERTAIN`;
- dois workers;
- reset concorrente;
- mudança do target Chatwoot;
- destino humano alterado ou removido;
- operação concluída como no-op;
- sanitização e Runtime V2 OFF;
- runner OFF, bloqueio em staging/produção, não sobreposição e shutdown.

Os quatro gaps funcionais permanecem como `test.todo`:

1. `atendiemnto`;
2. continuidade de preço;
3. evidência depois do caractere 250;
4. computador lento.

Resultados:

- harness HTTP: **28 passed, 0 failed e 4 `todo`**;
- testes de recovery/contrato/runner: **APROVADOS**, incluindo A–T, o
  cenário adicional de mudança do target entre GET e mutation e os contratos
  de runner;
- regressão relacionada: **286 passed e 0 failed**;
- falhas: **0**.

## 15. Paridade funcional

O Bloco 4B não altera o caminho saudável do handoff do Bloco 4A. Recovery atua
somente sobre operações incompletas e elegíveis.

Para turnos não relacionados a handoff, o contrato preserva:

- texto e status HTTP;
- categorias e contagens de provider;
- persistência e runtime logs;
- payload, quantidade de outbound e external message ID;
- preços e BusinessHours;
- Runtime V1 com Runtime V2 OFF.

Comprovação final de paridade: **APROVADA** pelo harness HTTP e pela regressão
relacionada.

## 16. Validações

- Prisma generate: **APROVADO**;
- Prisma validate: **APROVADO**;
- migrations locais: **APROVADAS** em banco vazio e no upgrade desde 4A;
- build fresco: **APROVADO**, SHA-256
  `3921d6684cbe13948c784a3596bd87d48fdae52f7502ed0bae1950e12dc4f8f6`;
- harness HTTP: **28 passed, 0 failed e 4 `todo`**;
- testes relacionados: **286 passed e 0 failed**;
- `node --check`: **APROVADO**;
- `git diff --check`: **APROVADO**;
- `git diff --cached --check`: **APROVADO antes do commit**;
- busca por dados sensíveis: **APROVADA**;
- teardown: **APROVADO**, sem containers, processos ou portas do harness.

Nenhuma validação deve usar staging, Chatwoot real ou provider real.

## 17. Commit e push

Mensagem autorizada:

`feat: add safe operational handoff recovery`

- branch: `feat/unified-policy-block4b-handoff-recovery`;
- hash e push: registrados no histórico Git e no entregável final, sem
  auto-referência dentro do commit;
- merge: **NÃO EXECUTADO**;
- deploy: **NÃO EXECUTADO**.

## 18. Estado final

Estado confirmado no gate:

- worktree: sem alterações fora do escopo; a limpeza pós-commit é registrada
  no entregável final;
- repositório principal: **INTACTO**;
- staging: **INTOCADO**;
- Runtime V2: **OFF**;
- quatro gaps funcionais ainda abertos: **CONFIRMADO**;
- próximo bloco: **NÃO INICIADO**.
