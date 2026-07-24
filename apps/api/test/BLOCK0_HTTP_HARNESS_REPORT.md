# Cubo.Chat — Fase 3, Bloco 0

## Harness HTTP de produção

**Data da validação:** 24 de julho de 2026

**Status:** implementado e em finalização controlada do Bloco 0

**Baseline implantada:** `02f3ccc61f320f87c06ff50d2f7ba809e08cc4ad`

**Worktree:** `/Users/danilosimionato/Projetos/CuboIAStudio-policy-block0`

**Branch:** `test/unified-policy-block0-http-harness`

Este documento registra o escopo, as decisões, a implementação e as
evidências do Bloco 0. Ele não autoriza nem inicia o Bloco 1.

## 1. Objetivo do bloco

O objetivo exclusivo foi criar um harness de integração HTTP que atravesse o
mesmo entrypoint e o mesmo bootstrap da API de produção:

```text
POST /webhooks/chatwoot
→ controller real
→ webhook service real
→ runtime de conversa real
→ persistência real
→ provider ou resposta determinística
→ sender real
→ fronteira HTTP falsa
```

O bloco não corrige comportamento funcional da IA.

## 2. Integridade e isolamento

- O trabalho foi realizado em worktree separado.
- O worktree foi criado diretamente a partir do commit baseline.
- O repositório principal não foi modificado.
- As mudanças locais preexistentes do repositório principal não foram
  restauradas, movidas, formatadas ou incorporadas.
- Não existe diff em `apps/api/src/**`.
- Não existe diff em `apps/api/prisma/schema.prisma`.
- Não existe migration nova ou modificada.
- Nenhum banco de staging ou produção foi acessado.
- Nenhum Chatwoot ou provider real foi acessado.
- Nenhuma mensagem real foi enviada.
- Até a revisão inicial registrada neste documento, nenhum commit, push ou
  deploy havia sido realizado.

O runner falha antes de iniciar os testes quando encontra:

- HEAD diferente do baseline aprovado;
- `DATABASE_URL`, `REDIS_URL` ou endpoint de provider fora de loopback;
- banco sem o prefixo exclusivo `cubo_policy_block0_test_*`;
- alteração tracked, staged ou unstaged em produção, schema ou migrations;
- arquivo não rastreado em produção, schema ou migrations;
- dependências ou binário Prisma ausentes.

## 3. Arquitetura do harness

### 3.1 Bootstrap da API

O harness executa o `dist/main.js` produzido por um build fresco. Isso executa
literalmente o `main.ts` da baseline, incluindo:

- `AppModule`;
- logger Pino;
- shutdown hooks;
- CORS;
- resposta para `OPTIONS`;
- `ValidationPipe` global;
- filtro global de exceções;
- Swagger;
- lifecycle real dos módulos.

Nenhum provider Nest central é substituído.

O processo filho inicia em um diretório temporário vazio para impedir que o
`ConfigModule` descubra arquivos `.env` do repositório principal.

Um preload exclusivo de teste:

- força o listener da porta aleatória para `127.0.0.1`;
- rejeita qualquer `fetch` cujo destino não seja loopback.

Essa é a única diferença intencional de bootstrap. O `main.ts` aceita uma
porta, mas não permite configurar explicitamente o host sem uma mudança de
produção, que estava proibida neste bloco.

### 3.2 PostgreSQL

Cada execução cria um container exclusivo:

- imagem: `pgvector/pgvector:pg16`;
- nome aleatório;
- porta loopback aleatória;
- banco com nome `cubo_policy_block0_test_<sufixo>`;
- senha fictícia gerada para a execução.

O runner aplica somente as 41 migrations existentes no baseline com
`prisma migrate deploy`.

O teardown remove somente o container criado pela própria execução.

### 3.3 Redis

Cada execução cria um container exclusivo:

- imagem: `redis:7-alpine`;
- porta loopback aleatória;
- persistência desabilitada;
- database lógico `0`, dentro do container descartável.

O teste realiza `PING`, grava e remove uma chave de readiness e fecha o cliente
com `QUIT`.

### 3.4 Fake Chatwoot stateful

O fake Chatwoot é uma fronteira HTTP real baseada em `node:http`.

Ele registra:

- método;
- path;
- query string;
- headers sanitizados;
- body;
- ordem;
- timestamp;
- resposta configurada.

Ele mantém estado de:

- conversa;
- `ai_active`;
- status;
- assignee;
- team;
- labels;
- mensagens inbound;
- mensagens outbound;
- external message ID.

Ele suporta respostas aceitas, 4xx, 5xx e timeout.

Endpoints representados:

- leitura da conversa;
- leitura de mensagens;
- criação de mensagem outbound;
- atualização da conversa;
- assignments;
- labels;
- toggle de status.

O fake não implementa o futuro handoff operacional. Ele apenas permite
observar o que o runtime tentou fazer.

### 3.5 Fake provider OpenAI-compatible

O provider falso também usa uma fronteira HTTP real e não acessa a internet.

As chamadas são classificadas e registradas separadamente como:

- embedding;
- classificação de intenção;
- geração final;
- extração de memória;
- request com ferramentas;
- tool calls retornadas.

As respostas podem ser configuradas por categoria e por teste, incluindo erro
HTTP e timeout.

O harness não depende apenas do campo legado `providerCount`.

## 4. Componentes reais preservados

O harness não substitui:

- Prisma;
- Redis/cache do módulo;
- `AssistantConversationsService`;
- `ChatwootWebhookService`;
- normalização Chatwoot;
- resolução de binding;
- deduplicação;
- `IntentRouter`;
- Flow Router;
- Knowledge Retrieval;
- Prompt Compiler;
- guards;
- persistência;
- contexto da conversa;
- sender V1.

Os testes não chamam `sendMessage`, controllers ou services diretamente para
simular o pipeline.

## 5. Fixtures

As fixtures usam apenas IDs e dados fictícios.

Elas criam:

- empresa;
- assistant;
- configuração de IA;
- comportamento do assistant;
- flow V1 ativo;
- binding Chatwoot por account/inbox;
- knowledge;
- chunks com embeddings;
- conversa interna, quando necessária;
- mensagens antigas, quando necessárias;
- estado de `currentContextVersion`.

### 5.1 Agenda oficial

Timezone: `America/Campo_Grande`.

| Dia | Horário |
|---|---|
| Segunda-feira | 08:00–22:00 |
| Terça-feira | 08:00–23:00 |
| Quarta-feira | 08:00–11:00 e 13:00–21:00 |
| Quinta-feira | 08:00–18:00 |
| Sexta-feira | 08:00–18:00 |
| Sábado | 07:30–12:00 |
| Domingo | Fechado |

### 5.2 Autoridades comerciais

| Serviço | Moeda | Valor | Qualifier |
|---|---|---:|---|
| `formatacao` | BRL | 1950 | `starting_at` |
| `placa_mae` | BRL | 395 | `starting_at` |

O preço de placa-mãe foi colocado propositalmente depois do caractere 250 para
manter o gap de preservação de evidência visível.

### 5.3 Configuração determinística

Para evitar timers e efeitos fora do escopo:

- message buffer desligado;
- memória desligada;
- extração de memória desligada;
- semantic memory desligada;
- split de resposta desligado;
- flow marcado como `V1_ONLY`.

## 6. Envelope Chatwoot

O envelope sanitizado inclui:

- event;
- account;
- inbox;
- conversation;
- message;
- sender/contact;
- direction;
- private;
- `ai_active`;
- IDs externos;
- timestamps;
- conteúdo.

Os IDs, contato e telefone são inteiramente fictícios.

## 7. Runtime V2

Todas as flags e allowlists relevantes são configuradas explicitamente como
`OFF` ou vazias.

Em cada teste são verificadas:

- zero linhas de estado V2;
- zero eventos V2;
- nenhum runtime log com mode V2;
- nenhum `responseExecutionOwner=V2_PRIMARY`;
- nenhuma rota de geração V2;
- nenhum atributo de outbound que identifique sender V2;
- flow da fixture em `V1_ONLY`.

As classes V2 podem existir no grafo de dependência do `AppModule`, mas nenhum
state, event, output, sender ou fallback V2 é executado.

## 8. Testes do harness

### Teste A — Webhook real até outbound

Entrada:

> Oi tudo bem?

Comprova:

- entrada por `POST /webhooks/chatwoot`;
- criação da conversa interna;
- persistência de um inbound;
- persistência de uma resposta local;
- uma geração final;
- um único outbound ao fake Chatwoot;
- external message ID retornado pelo fake e persistido;
- um runtime log;
- ausência de Runtime V2.

Resultado: **passou**.

### Teste B — Dedupe

Entrada:

- o mesmo envelope;
- o mesmo external message ID;
- duas entregas HTTP consecutivas.

Comprova:

- segunda entrega identificada como duplicada;
- um inbound lógico;
- uma resposta lógica;
- uma geração final;
- um runtime log;
- um outbound;
- dois diagnósticos de delivery, um por tentativa de webhook;
- ausência de Runtime V2.

Resultado: **passou**.

Limitação preservada: o Runtime V1 ainda não reconcilia uma decisão persistida
cujo outbound nunca foi confirmado. O teste não transforma essa limitação em
comportamento desejado.

### Teste C — Isolamento de contextVersion

Estado preparado:

- conversa preexistente em `currentContextVersion=2`;
- uma mensagem de usuário e uma resposta da versão 1;
- sentinelas exclusivas no conteúdo antigo.

Comprova:

- sentinelas antigas não entram no payload do provider;
- novo inbound fica na versão 2;
- nova resposta fica na versão 2;
- histórico antigo permanece preservado;
- manifesto registra zero mensagens antigas utilizadas;
- ausência de Runtime V2.

Resultado: **passou**.

### Teste D — Formatação como controle positivo

Entrada:

> Qual o valor pra formatar um PC ai?

Comprova:

- resposta oficial de formatação;
- `serviceKey=formatacao`;
- moeda BRL;
- valor 1950;
- `qualifier=starting_at`;
- uma autoridade elegível;
- decisão `AUTHORIZED`;
- estratégia determinística de preço;
- zero geração final;
- embedding registrado separadamente;
- um outbound;
- ausência de Runtime V2.

Resultado: **passou**.

### Invariante transversal — Runtime V2 desligado

As invariantes de Runtime V2 são executadas em todos os testes A–D.

Isso não cria um quinto cenário executável.

Resultado consolidado:

```text
tests: 9
passed: 4
failed: 0
todo: 5
```

Interpretação: quatro cenários executáveis, uma invariante transversal de
Runtime V2 OFF aplicada aos quatro e cinco especificações futuras `test.todo`.

## 9. Gaps futuros visíveis

Os casos abaixo estão registrados como `test.todo`. Eles não fazem o build
falhar e não aceitam a resposta errada atual como contrato.

1. Erro ortográfico `atendiemnto` deve alcançar BusinessHours determinístico.
2. “E para consertar minha placa mae?” deve herdar intenção de preço, trocar o
   serviço ativo e responder BRL 395 `starting_at`.
3. Evidência factual após o caractere 250 deve continuar disponível.
4. Computador lento deve gerar qualificação ou próximo passo útil, sem
   diagnóstico factual ou resposta puramente genérica.
5. Handoff deve bloquear localmente, confirmar transição remota e destino
   humano antes da confirmação visível.

## 10. Chamadas observadas

| Teste | Embedding | Intent | Geração final | Memória | Requests com tools | Tool calls | Chatwoot reads | Outras mutations | Outbound |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| B, incluindo retry | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| C | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| D | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

Os controles positivos fornecem `ai_active` no próprio envelope; por isso não
precisam executar uma leitura remota da conversa. O fake já suporta esse path
para testes futuros.

## 11. Compatibilizações de testes legados

O build fresco revelou quatro falhas nos testes existentes:

- três testes de sender não forneciam o estado de conversa exigido pela
  revalidação atual de pausa e `contextVersion`;
- um teste ainda esperava apagar triagem com `null`, enquanto o contrato
  implantado preserva os fatos coletados em um estado resolvido e inativo.

Foram ajustados somente os doubles e asserções dos testes. Nenhuma lógica de
produção foi alterada.

Resultado da seleção diretamente relacionada:

```text
tests: 118
passed: 118
failed: 0
```

## 12. Build fresco

O harness executa:

1. geração do Prisma Client;
2. migrations no banco descartável;
3. build TypeScript;
4. verificação de timestamp de `dist/main.js` e `dist/app.module.js`;
5. cálculo de SHA-256 combinado;
6. somente então inicia os testes.

Último build validado:

```text
sha256: 6b14a9cd718c50a8e057f17845056181267e5c362ae78101c81790afaa70375e
timestamp: 2026-07-24T21:14:59.391Z
```

O `dist` não foi copiado do repositório principal.

## 13. Validações executadas

### Dependências

```text
npm ci
```

Resultado: concluído; lockfile inalterado.

O npm reportou quatro vulnerabilidades preexistentes:

- uma moderada;
- três altas.

Nenhum `audit fix` foi executado para evitar mudanças fora do escopo.

### Harness

```text
npm run test:http-harness
```

Resultado: 4 passed, 0 failed, 5 todo.

### Testes relacionados

```text
node --test --test-concurrency=1 \
  test/chatwoot-webhook-and-runtime.test.mjs \
  test/outbound-external-reference.test.mjs \
  test/rag-price-authority.test.mjs \
  test/canonical-inbound-message.test.mjs \
  test/runtime-stabilization.test.mjs
```

Resultado: 118 passed, 0 failed.

### Sintaxe

`node --check` foi executado em todos os novos arquivos `.mjs` e `.cjs`.

Resultado: passou.

### Git

```text
git diff --check
```

Resultado: passou sem saída.

### Teardown

Foram verificados:

- ausência de containers com o label do harness;
- ausência do processo `dist/main.js` do worktree;
- fechamento das portas finais do PostgreSQL e Redis;
- remoção dos diretórios temporários;
- fechamento dos fakes.

Resultado: nenhum recurso pertencente ao harness permaneceu ativo.

Também foi executada uma interrupção controlada por `SIGINT`. O runner
encerrou o grupo de subprocessos, removeu seus containers e deixou fechadas as
portas atribuídas à execução interrompida.

## 14. Arquivos do bloco

### Novos

- `apps/api/test/BLOCK0_HTTP_HARNESS_REPORT.md`
- `apps/api/test/README.production-http-harness.md`
- `apps/api/test/production-http-harness.test.mjs`
- `apps/api/test/helpers/chatwoot-envelope.mjs`
- `apps/api/test/helpers/loopback-only-network.cjs`
- `apps/api/test/helpers/production-app-process.mjs`
- `apps/api/test/helpers/production-fixtures.mjs`
- `apps/api/test/helpers/run-production-http-harness.mjs`
- `apps/api/test/helpers/stateful-http-fakes.mjs`

### Modificados

- `apps/api/package.json`
- `apps/api/test/chatwoot-webhook-and-runtime.test.mjs`
- `apps/api/test/outbound-external-reference.test.mjs`

## 15. Limitações conhecidas

- O preload de loopback é uma diferença de teste necessária porque `main.ts`
  não aceita um host de listener.
- Buffer, memória e split ficam desligados nas fixtures.
- Por consequência, o harness ainda não valida buffer concorrente.
- O fake Chatwoot cobre os endpoints alcançáveis atuais, mas não implementa
  handoff operacional.
- O teste de dedupe não resolve reconciliação de entrega.
- O harness não reproduz todas as condições possíveis de produção; ele valida
  os controles nomeados usando bootstrap e serviços centrais reais, com
  Chatwoot e provider representados por fronteiras HTTP falsas.
- Os cinco bugs funcionais permanecem apenas como especificações futuras.
- Não foi realizado teste real pela linha de QA.

## 16. Estado Git

O worktree continua no commit baseline:

```text
02f3ccc61f320f87c06ff50d2f7ba809e08cc4ad
```

Antes do gate de finalização, não havia:

- staging;
- commit;
- push;
- deploy;
- alteração de branch após a criação do worktree.

## 17. Gate para continuação

O Bloco 1 não foi iniciado e permanece fora do escopo.

Qualquer trabalho adicional depende de revisão e autorização explícita.
