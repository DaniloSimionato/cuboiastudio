# Fase 3 de 3 — Bloco 3B.2

## 1. Escopo, baseline e isolamento

Este bloco parte exclusivamente do commit aprovado do Bloco 3B.1:

`fcdfb15b1f4763ad4d6b0e0a2fd7690921471bcd`

O trabalho foi realizado no worktree isolado
`/Users/danilosimionato/Projetos/CuboIAStudio-policy-block3b2`, na branch
`feat/unified-policy-block3b2-outbound-recovery`.

Commit de implementacao validado e publicado:

`1c9ad875a9a2e3b03cdcb5ec458e9c3ee223fe05`

O repositório principal não foi usado como fonte de código não implantado. Seu
HEAD e seu conjunto de alterações locais foram comparados antes e depois do
trabalho e permaneceram inalterados. Nenhum endpoint, banco, Redis, Chatwoot ou
provider de staging/produção foi usado pelos testes. Todas as URLs mutáveis do
harness são loopback. Runtime V2 permaneceu explicitamente desligado.

## 2. Auditoria read-only da fronteira existente

O sender V1 usa `fetch` global para criar mensagens no endpoint de mensagens da
conversa Chatwoot. O corpo é JSON, e a serialização pode ser concluída antes de
marcar o início da fronteira. O código e os testes existentes permitem
distinguir:

- configuração ou serialização inválida antes da fronteira;
- códigos de transporte que provam falha de conexão antes de aceitação remota;
- resposta HTTP efetivamente recebida;
- timeout ou fechamento de socket ambíguo;
- sucesso HTTP com ou sem identificador externo.

Os códigos tecnicamente classificados como falha pré-aceitação são
`ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN` e `UND_ERR_CONNECT_TIMEOUT`. Outros
erros de transporte falham para o lado seguro.

O ID externo pode ser normalizado dos campos diretos ou aninhados já aceitos
pelo sender. O repositório não contém prova de suporte do Chatwoot a uma chave
de idempotência remota. Existe leitura da lista de mensagens da conversa e o
Chatwoot preserva `content_attributes`; por isso uma referência técnica exata
encontrada é evidência positiva. A ausência em uma resposta paginada não é
prova de ausência remota.

## 3. Classificação de falhas

Status e segurança de retry são dimensões separadas:

| Situação observável | Status | Retry safety | Recovery |
| --- | --- | --- | --- |
| Nunca houve tentativa | `PENDING` | `UNKNOWN` | elegível, com controle válido |
| Falha comprovada antes de aceitação | `FAILED_RETRYABLE` | `PROVEN_SAFE` | elegível após backoff |
| 4xx permanente | `FAILED_TERMINAL` | `NOT_RETRYABLE` | nunca automático |
| 5xx recebido | `UNCERTAIN` | `RECONCILE_REQUIRED` | somente reconciliação |
| Timeout/socket ambíguo | `UNCERTAIN` | `RECONCILE_REQUIRED` | somente reconciliação |
| Ack conhecido | `ACKNOWLEDGED` | `NOT_RETRYABLE` | nunca repetir |
| Controle divergente | `CANCELLED_STALE` | `NOT_RETRYABLE` | nunca repetir |

Um 5xx não é tratado como prova de ausência de efeito. O fake possui dois
cenários distintos: rejeitar sem criar e criar antes de responder 5xx. Ambos
são inconclusivos para o cliente HTTP; somente o segundo pode depois ser
confirmado pela referência remota. Registros históricos
`FAILED_RETRYABLE + UNKNOWN` continuam legíveis e nunca são repetidos
automaticamente.

## 4. Modelo persistido

`AssistantOutboundDelivery` recebeu somente colunas aditivas:

- versão do contrato de payload e flag de handoff legado;
- `retrySafety`;
- budget máximo;
- início e expiração de lease;
- próxima elegibilidade;
- estado e evidência de reconciliação;
- motivo técnico de bloqueio.

Foi adicionada `AssistantOutboundAttempt` porque a linha única do ledger não
preservava por tentativa:

- owner;
- número;
- início, expiração e término;
- instante de entrada na fronteira;
- resultado e segurança;
- status HTTP;
- ID externo;
- erro sanitizado.

A tentativa é única por `(deliveryId, attemptNumber)` e é removida em cascade
com o delivery. Ela não duplica conteúdo, payload, telefone, prompt, headers,
token, corpo remoto ou knowledge.

## 5. Lease, claim e concorrência

O coordinator usa o mesmo ledger durável e adquire claim dentro de transação:

1. trava a conversa interna;
2. revalida `conversationId`, `contextVersion`, `controlRevision`,
   `aiActive=true` e `pausedByHuman=false`;
3. avalia status, safety, budget e backoff;
4. faz CAS do delivery para `SENDING`;
5. cria a tentativa com owner, ordinal e lease;
6. somente o vencedor pode chamar o sender.

O lease possui duração explícita e não usa `updatedAt` como autorização. Dois
workers disputando o mesmo delivery resultam em um claim e uma única chamada
HTTP.

Um lease expirado não volta automaticamente para `PENDING`:

- sem `boundaryStartedAt`, a tentativa vira
  `ABANDONED_BEFORE_BOUNDARY`, com safety comprovada e backoff;
- com `boundaryStartedAt`, vira `ABANDONED_AFTER_BOUNDARY`, e o delivery fica
  `UNCERTAIN`, exigindo reconciliação.

## 6. Recovery coordinator

`OutboundRecoveryCoordinator` atua somente sobre deliveries existentes. Ele não
produz texto, não chama provider, não cria decisão, não cria mensagem terminal,
não altera flow, RAG ou autoridade e não modifica payload comercial.

Ele pode:

- selecionar deliveries elegíveis;
- disputar claim;
- revalidar controle;
- registrar entrada na fronteira;
- enviar somente quando seguro;
- finalizar tentativa;
- reconciliar evidência remota;
- atualizar ledger e resumo do manifesto.

Não foi criado scheduler, cron, fila, intervalo, hook de startup, endpoint ou
rota administrativa. O coordinator é diretamente testável, mas a recuperação
automática não está ativada em nenhum ambiente.

## 7. Reconciliação

As evidências positivas implementadas são:

1. external message ID já persistido no delivery ou na mensagem local;
2. mensagem encontrada na conversa Chatwoot com
   `content_attributes.cubo_outbound_delivery_id` exatamente igual ao ID do
   delivery.

Quando encontrada, a reconciliação marca `ACKNOWLEDGED`, persiste o ID externo e
não envia. Quando a leitura falha ou a lista não contém a referência, o
resultado permanece `UNCERTAIN`; ausência em lista paginada não autoriza retry.

O contrato interno admite `ABSENCE_PROVEN` para uma capacidade remota futura,
mas a integração Chatwoot atual nunca declara ausência comprovada.

## 8. Janela após ack e restart

A tentativa é finalizada antes da transição final do delivery. Assim, se o
Chatwoot retornar sucesso e a atualização do delivery falhar:

- a tentativa mantém resultado `ACKNOWLEDGED` e ID externo;
- o delivery pode permanecer `SENDING`;
- após a expiração do lease/restart, o estado não é reenviado;
- a reconciliação positiva restaura o ack local.

Foi corrigido um caso detectado pela suíte em que uma falha após finalizar a
tentativa provocava uma segunda finalização e terminava em claim perdido. O
coordinator agora reconhece a tentativa já concluída e preserva a janela para
reconciliação.

## 9. Backoff e budget

O contrato possui defaults conservadores:

- lease de 60 segundos;
- máximo de três tentativas;
- sequência base de 1, 5 e 30 minutos;
- teto de uma hora;
- jitter determinístico derivado do delivery e do número da tentativa.

Não existe loop de retry na stack da falha. `nextEligibleAt` bloqueia execução
antecipada. Budget esgotado termina o delivery com motivo técnico
`RECOVERY_BUDGET_EXHAUSTED`.

## 10. Payload recuperável e compatibilidade

O runtime marca como recuperável somente o caso em que:

- existe um único bloco outbound;
- o conteúdo persistido da mensagem terminal representa exatamente esse bloco.

Isso permite reconstruir o mesmo request de texto sem persistir o payload
completo no ledger. Dados históricos e respostas divididas recebem
`V1_LEGACY_UNVERIFIED` e são bloqueados no recovery. A primeira tentativa
normal continua permitida para preservar o comportamento do Runtime V1 e os
testes de split existentes.

O único acréscimo técnico ao request é
`content_attributes.cubo_outbound_delivery_id`, usado como referência durável
de reconciliação. Texto, sender, direção, privacidade, handoff legado e número
de blocos permanecem sob o contrato existente.

## 11. Duplicate, handoff e Runtime V2

O webhook duplicate continua apenas reutilizando turno, decisão e delivery. Ele
não chama provider, sender ou coordinator e não dispara retry.

`EXPLICIT_HUMAN_HANDOFF_LEGACY` usa o mesmo ledger/recovery apenas quando
tecnicamente seguro, sem ganhar semântica operacional: não pausa, não altera
`aiActive`, `pausedByHuman`, team, assignee, labels ou status remoto.

Todas as fixtures mantêm Runtime V2 OFF. A suíte HTTP e cada cenário de recovery
verificam ausência de state/event/sender V2.

## 12. Manifesto e sanitização

O owner continua sendo
`AssistantRuntimeLog.metadata.turnExecutionManifest`. O manifesto armazena
somente resumo e referências:

- versões dos contratos de recovery e tentativa;
- delivery e ordinal da tentativa;
- fingerprint do lease owner;
- início e expiração;
- safety, elegibilidade e próxima data;
- resultado;
- estado/tipo de evidência de reconciliação;
- motivo técnico de bloqueio.

Ele não contém conteúdo integral, payload, prompt, token, Authorization,
headers, response body, telefone ou knowledge integral. Mensagens continuam
contendo apenas as referências já previstas.

## 13. Migration

A migration `20260725180000_add_outbound_recovery_safety` é exclusivamente
aditiva. Ela:

- adiciona colunas com defaults compatíveis à tabela existente;
- cria a tabela de attempts;
- cria índices e unique;
- adiciona FK com cascade;
- não altera nem remove `controlRevision`;
- não executa backfill destrutivo.

O harness valida:

- aplicação completa em banco vazio;
- upgrade local após todas as migrations do Bloco 3B.1;
- leitura de delivery histórico com defaults;
- defaults de attempts;
- unique por tentativa;
- FK e cascade.

Nenhuma migration foi ou deve ser executada em staging neste bloco.

## 14. Testes

A suíte HTTP pelo bootstrap real mantém:

- 14 cenários executáveis;
- Runtime V2 OFF como invariante transversal;
- 5 `test.todo`;
- 19 testes declarados;
- resultado final: 14 passed, 0 failed, 5 todo.

A suíte de recovery cobre:

- A — `PENDING`;
- B — retry comprovadamente seguro;
- C — safety histórica desconhecida;
- D — 5xx sem efeito, porém sem prova suficiente para repetir;
- E — 5xx após criação e reconciliação sem reenvio;
- F — timeout após criação;
- G — falha de persistência local após ack e restart;
- H/I — lease expirado antes/depois da fronteira;
- J — dois workers;
- K — controle stale;
- L — budget;
- M — backoff com clock controlado;
- O/P — restart matrix e sanitização;
- Q — handoff legado.

As regressões relacionadas incluem webhook/runtime, canonical inbound, RAG e
preço, BusinessHours, contexto oficial, reset, control snapshot, outbound,
split, tools, Runtime stabilization, decisão e manifesto.

Resultado final da seleção relacionada: 241 passed, 0 failed.

Os cinco gaps funcionais permanecem como `test.todo`:

1. `atendiemnto`;
2. continuidade de preço;
3. evidência após o caractere 250;
4. computador lento;
5. handoff operacional.

## 15. Paridade e limitações

No caminho normal foram preservados:

- status HTTP;
- texto;
- contagem de embeddings, classificação e geração final;
- mensagem terminal;
- número de outbounds;
- external message ID;
- sender V1;
- handoff legado;
- Runtime V2 OFF.

Limitações deliberadas:

- recovery automático não foi ativado;
- não existe prova remota de ausência;
- ausência em lista Chatwoot é inconclusiva;
- payloads históricos/split não são recuperados automaticamente;
- controle remoto divergente sem sincronização local permanece invisível;
- ack do POST não é chamado de entrega final ao usuário;
- os cinco gaps de atendimento continuam abertos.
