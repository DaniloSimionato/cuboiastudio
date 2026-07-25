# AI_RUNTIME_PLAN.md

Plano tecnico e registro de evolucao do cerebro da IA do Cubo AI Studio.

Este documento define a evolucao do runtime mantendo autoridade deterministica,
seguranca de secrets e separacao clara entre provider, assistant, knowledge,
pipeline, logs, tools, controle de conversa e canais.

> Estado de referencia: Runtime V1 estabilizado ate o Bloco 4A. Runtime V2
> permanece OFF. As secoes AI-000 a AI-007 abaixo registram marcos historicos e
> nao substituem os contratos atuais dos relatorios de estabilizacao.

## 1. Estado atual

- O Runtime V1 e o unico runtime operacional ativo; Runtime V2 esta OFF.
- O backend possui tenant, RBAC, assistants, knowledge, flows, tools, conversas,
  logs, provider real opcional, embeddings e RAG.
- O frontend nunca chama provedores externos diretamente.
- O Chatwoot entra pelo endpoint real `POST /webhooks/chatwoot`.
- O inbound e normalizado, deduplicado e ligado a uma conversa interna e a um
  `currentContextVersion`.
- Cada turno aceito possui `turnExecutionId`, policy
  `V1_COMPATIBILITY_POLICY`, manifesto sanitizado e uma decisao terminal selada.
- Um executor unico persiste a mensagem terminal, finaliza o runtime log e
  prepara o outbound.
- `controlRevision` e checkpoints CAS bloqueiam provider, selamento, efeitos ou
  outbound quando o estado local muda durante o turno.
- Todo outbound pretendido possui ledger duravel antes da fronteira HTTP.
- Claims e attempts possuem ownership, lease, budget, backoff e retry safety.
- `UNCERTAIN` nunca e reenviado diretamente.
- Reconciliacao pode restaurar ack por ID externo ou referencia tecnica remota
  exata, sem gerar nova decisao ou mensagem.
- Recovery automatico nao esta ativado; nao existe scheduler, worker, endpoint
  ou hook de startup para o coordinator.
- Pedido humano explicito produz uma decisao operacional e uma operacao
  persistida unica. O CAS local bloqueia a IA antes de qualquer mutacao
  Chatwoot.
- A confirmacao de handoff somente e criada depois de `GET -> PUT
  ai_active=false -> GET` comprovar a conversa, o estado remoto e um assignee
  ou team humano ja existente.
- Falha ou ambiguidade remota mantem a IA local bloqueada, nao produz texto de
  sucesso e exige reconciliacao futura do Bloco 4B.
- O smoke e o harness HTTP nao dependem de provider ou servico real.

## 2. Problema atual

O problema atual nao e mais apenas ligar um provider. A prioridade e fazer todas
as capacidades do Runtime V1 obedecerem a contratos coerentes de decisao,
autoridade, estado e entrega.

Os principais limites ainda abertos sao:

- entendimento e continuidade multi-turno ainda nao possuem estado estruturado
  completo;
- evidencia integral pode ser perdida quando o runtime reduz knowledge a
  preview;
- consultas abertas podem resultar em respostas genericas;
- PostgreSQL e a autoridade local, mas divergencia remota de pausa sem
  sincronizacao ainda nao e detectada;
- recovery seguro existe, mas sua ativacao operacional permanece pendente;
- operacoes de handoff parciais ainda dependem de reconciliacao manual; o
  Bloco 4A nao ativa scheduler ou worker para elas;
- somente assignee ou team ja presentes na conversa constituem destino humano
  comprovado; inbox isolada nao e assumida como fila;
- ausencia em lista paginada do Chatwoot nao prova ausencia do efeito remoto.

## 3. Objetivo do cerebro da IA

Manter uma unica politica de atendimento no Runtime V1 em que:

- detectores produzem sinais;
- flows produzem contexto;
- RAG produz evidencia;
- autoridades produzem fatos oficiais;
- provider produz draft quando permitido;
- guards validam;
- uma unica decisao e selada;
- um unico executor possui efeitos terminais;
- controle stale bloqueia o turno;
- outbound possui identidade, ledger e tentativa auditavel.

O objetivo nao e responder tudo deterministicamente nem delegar fatos oficiais
ao provider. Determinismo e provider devem coexistir sob uma unica precedencia.

## 4. Arquitetura proposta

### 4.1 Provider de IA

Criar uma camada unica de provider no backend para isolar OpenAI, DeepSeek e outros providers futuros.

Regras:

- o provider real e chamado apenas pelo backend
- o frontend nunca recebe API key
- a selecao de provider deve ser por configuracao
- o provider deve aceitar `AI_BASE_URL` para compatibilidade com gateways ou providers alternativos

### 4.2 Prompt e instrucoes

O assistant precisa guardar instrucoes reais e configuracoes de comportamento.

Campos conceituais:

- `instructions`
- `model`
- `temperature`

Esses campos pertencem ao dominio do assistant e nao a mocks.

### 4.3 Runtime real de conversa

O caminho operacional atual segue, em alto nivel:

1. receber e validar o webhook;
2. normalizar e deduplicar o inbound;
3. resolver binding e conversa;
4. capturar `contextVersion` e control snapshot;
5. executar detectores, flows, RAG e autoridades existentes;
6. chamar o provider apenas quando o caminho atual permitir;
7. executar guards e selar uma decisao;
8. persistir mensagem terminal, runtime log e delivery `PENDING`;
9. revalidar controle e disputar claim;
10. cruzar a fronteira Chatwoot por um unico sender;
11. registrar attempt, ack, falha ou incerteza;
12. reconciliar apenas quando houver evidencia segura.

Fallbacks existentes continuam sob compatibilidade V1, mas nao podem criar uma
segunda decisao ou enviar fora do executor.

O pedido humano explicito acrescenta uma sequencia especial, ainda dentro do
mesmo Runtime V1 e do mesmo executor:

1. selar `OPERATIONAL_HUMAN_HANDOFF`, com provider proibido;
2. persistir uma operacao unica para turno e decisao;
3. alterar `aiActive=false`, `pausedByHuman=true` e incrementar
   `controlRevision` no mesmo CAS local;
4. ler a conversa remota para resolver assignee ou team existente;
5. solicitar somente `ai_active=false` pelo contrato Chatwoot comprovado;
6. reler e verificar scope, estado, status e destino;
7. criar a confirmacao somente se a verificacao for positiva;
8. entregar a confirmacao pelo ledger outbound existente.

O Bloco 4A nao atribui assignee/team, nao muda labels/status e nao considera
resposta 2xx da mutacao, isoladamente, como prova de handoff.

### 4.4 Fallback deterministico

O runtime deterministico deve continuar existindo para:

- desenvolvimento local
- demo offline
- smoke test
- fallback de resiliencia

Ele nao deve ser removido nem substituido antes do runtime real estar validado.

### 4.5 Logs e observabilidade

O owner canonico da execucao e
`AssistantRuntimeLog.metadata.turnExecutionManifest`. Ele registra, de forma
sanitizada:

- identidade do turno e policy version;
- conversa e `contextVersion`;
- snapshot e checkpoints de controle;
- caminho terminal e decisao selada;
- categorias observaveis de provider;
- referencias de autoridade;
- delivery, attempt, lease, retry safety e reconciliacao;
- operacao de handoff, resolucao sanitizada do destino, revisoes, mutacao,
  verificacao e referencia da confirmacao;
- resultado conhecido do outbound.

O manifesto nao duplica mensagem, prompt completo, knowledge integral, token,
headers ou response body sensivel.

### 4.5.1 Runtime Pipeline v1

AI-005 organiza o runtime e a tela `/testes` em 7 partes conceituais:

1. Mensagem inicial
2. Instrucoes
3. Contexto
4. Modelo + Temperatura
5. Atraso / Inatividade
6. Saidas
7. Resumo

Implementado agora:

- `initialMessage` opcional no Assistant
- criacao de conversa com mensagem inicial persistida quando configurada
- retorno de `runtime.temperature`, `runtime.outcome` e `runtime.summary`
- retorno de `runtime.context` com historico usado, limite de historico, mensagem inicial incluida e instrucoes incluidas
- painel de debug em `/testes` mostrando as 7 partes
- estabilizacao do laboratorio `/testes`: trocar assistant limpa conversa ativa, mensagens e debug antigos
- fallback mostra `runtime.reason` de forma mais clara para distinguir IA desabilitada, modelo ausente, provider incompleto, auth/quota do provider ou erro geral
- AI-006 Contexto de Conversa v1 monta o prompt com nome/descricao do assistant, mensagem inicial quando configurada, instrucoes/persona, base de conhecimento ativa, historico recente limitado e mensagem atual do usuario
- fallback deterministico considera o nome/persona do assistant e nunca se apresenta como IA real

Fica para issues futuras:

- timer real de inatividade
- saidas condicionais reais
- resumo persistido avancado
- logs/observabilidade detalhada

### 4.6 Knowledge e RAG

Embeddings, busca semantica, scopes e filtro por tags ja existem. A evolucao
necessaria agora e preservar evidencia factual integral entre recuperacao,
authority resolution, prompt e guards. Preview serve apenas para telemetria e
nao pode ser a representacao factual autoritativa.

### 4.7 Tools e functions

Tools backend-only, incluindo calendario e custom webhooks, ja possuem cobertura
relacionada. Elas devem continuar sem acesso a secrets no frontend e sem
adquirir ownership de decisao ou outbound. Handoff humano nao deve ser
modelado como simples tool textual.

### 4.8 Canais externos

Chatwoot/Cubo.Chat ja e um canal operacional. O contrato validado usa o webhook
real e o sender V1 existente. Novos canais devem reutilizar identidade,
dedupe, decisao, controle e ledger, sem criar runtimes ou senders terminais
concorrentes.

## 5. Sequencia de implementacao

Sequencia historica da construcao inicial:

1. AI-000 - documentar este plano
2. AI-001 - provider de IA real
3. AI-002 - prompt e instrucoes do assistant
4. AI-003 - runtime real de conversa
5. AI-004 - configuracao de IA por tenant/empresa
6. AI-005 - Runtime Pipeline v1 baseado nas 7 partes do Assistente
7. AI-006 - contexto de conversa v1 com historico/persona
8. AI-007 - logs e observabilidade de IA
9. AI-008 - knowledge e RAG simples
10. BE-022 - CRUD inicial de Tools
11. AI-009 - canais externos

Se necessario, BE-022 continua como a issue concreta para a fase de tools.

AI-001 ja foi entregue como camada backend-only, sem ligar o runtime `/testes` a IA real.
AI-002 ja foi entregue como persistencia e edicao de prompt/configuracao do assistant.
AI-003 ja foi entregue como runtime de conversa com provider real e fallback deterministico.
AI-004 agora foi entregue como configuracao de IA por tenant/empresa via frontend, com segredo cifrado no backend.
AI-004 FIX adicionou presets seguros de OpenAI, DeepSeek e Custom em `GET /settings/ai/options`, melhorou mensagens de erro `400` e deixou claro que `POST /settings/ai/test` deve ser usado depois de salvar uma configuracao valida.
AI-004 FIX 2 melhorou o diagnostico seguro de `POST /settings/ai/test`: erros do provider agora podem retornar `providerStatus` e `providerError` sanitizados, sem API key, headers ou request completo.
AI-005 agora foi entregue como Runtime Pipeline v1: o Assistant ganhou `initialMessage`, a conversa nova pode iniciar com essa mensagem, o runtime retorna `outcome` e `summary`, e `/testes` mostra as 7 partes do assistente sem expor prompts completos gigantes nem secrets.
AI-005 FIX estabilizou o laboratorio `/testes`: conversas sao sempre carregadas por assistant, `Conversation not found` vira orientacao amigavel, assistants tecnicos de smoke ficam ocultos na UI padrao, e o smoke inativa o assistant criado ao final.

Sequencia de estabilizacao arquitetural concluida posteriormente:

1. Fase 1 - auditoria forense read-only;
2. Fase 2 - arquitetura incremental da politica de atendimento;
3. Bloco 0 - harness HTTP pelo entrypoint e bootstrap de producao;
4. Bloco 1 - identidade e observabilidade minima do turno;
5. Bloco 2 - decisao terminal e executor unicos;
6. Bloco 3A - `controlRevision`, snapshots e checkpoints CAS;
7. Bloco 3B.1 - ledger duravel e ownership de tentativa;
8. Bloco 3B.2 - recovery e reconciliacao segura.
9. Bloco 4A - handoff humano operacional fail-closed.

O Bloco 4B permanece pendente e devera tratar recovery e reconciliacao de
operacoes parciais de handoff. Runtime V2 nao deve ser ativado como atalho para
as etapas seguintes.

## 6. Variaveis de ambiente futuras

Variaveis conceituais esperadas:

```env
APP_ENCRYPTION_KEY=
AI_RUNTIME_ENABLED=false
AI_PROVIDER=openai
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=
```

Regras:

- `AI_RUNTIME_ENABLED=false` mantem o runtime deterministico
- `APP_ENCRYPTION_KEY` protege a chave por tenant quando a configuracao de IA for salva
- se `APP_ENCRYPTION_KEY` estiver ausente ou invalida, salvar nova API key deve falhar com erro controlado e sem vazar segredo
- `AI_API_KEY` vive apenas no backend
- o frontend nunca recebe essa chave
- o smoke nao pode depender de chave real

## 7. Seguranca e secrets

Regras obrigatorias:

- secrets de provider vivem somente no backend
- frontend nao armazena segredo
- browser nao chama provider externo
- logs nao podem expor `Authorization` ou API key
- erros de provider podem expor apenas status e campos sanitizados como `message`, `type`, `code` e `param`
- toda integracao sensivel precisa de auditoria

Se houver fallback, ele deve ser seguro e previsivel.

## 8. Fallback deterministico

O fallback deterministico permanece como parte oficial do produto.

Ele e util para:

- demo local
- treinamento interno
- ambiente sem segredo configurado
- continuidade operacional quando o provider falhar

O fallback nao deve mascarar erro de integracao real.
Quando ele for acionado, isso precisa ficar claro nos logs.

## 9. Como e testado

O harness principal:

- sobe PostgreSQL e Redis locais descartaveis;
- aplica migrations reais;
- gera build fresco;
- inicia `dist/main.js` e o `AppModule` real;
- entra por `POST /webhooks/chatwoot`;
- usa fakes HTTP stateful apenas para Chatwoot e provider;
- impede rede nao loopback;
- encerra app, Prisma, Redis, fakes, portas e containers.

Controles declarados no working tree do Bloco 4A:

- 27 cenarios HTTP executaveis, incluindo 14 caracterizacoes de handoff
  operacional e 13 controles anteriores;
- 4 gaps funcionais como `test.todo`;
- 1 especificacao `test.todo` separada para recovery automatico de handoff no
  Bloco 4B;
- 7 testes unitarios do contrato operacional;
- migrations testadas em banco vazio e upgrade local;
- restart, multi-worker, backoff, budget, stale control e reconciliacao
  outbound continuam no gate relacionado;
- Runtime V2 OFF como invariante transversal.

Gate final do Bloco 4A:

- harness HTTP: 27 passed, 0 failed e 5 `todo`;
- regressao relacionada: 254 passed e 0 failed;
- contrato unitario de handoff: 7 passed e 0 failed;
- build fresco, SHA-256 combinado do conjunto de artefatos V1:
  `56c4a24b720184b7e843fb4d84c107a48935d9f091d8848d9d6c5c73cd4696af`.
- `dist/main.js`, SHA-256 individual:
  `3b6f23e68dbc6103c45b3949ad8206e8e90e11dd8e71368be9c341a76ac0c4df`.

Consulte o relatorio do bloco para migrations, teardown, sanitizacao e
limitacoes.

Comando principal:

```bash
cd apps/api
npm run test:http-harness
```

Consulte `apps/api/test/README.production-http-harness.md` para limites e
evidencias de build.

## 10. O que nao entrou no Bloco 4A

- scheduler ou worker de recovery;
- retry automatico ativado;
- prova remota de ausencia;
- recuperacao automatica de payload historico ou resposta dividida;
- recovery automatico de operacao parcial de handoff;
- criacao ou alteracao de assignee, team, labels ou status;
- configuracao administrativa de destino humano;
- inbox tratada por presuncao como fila humana valida;
- polling remoto de pausa;
- outbox para outros canais;
- correcao de BusinessHours com erro ortografico;
- continuidade de preco;
- preservacao integral da evidencia alem do preview;
- politica de completude comercial;
- Runtime V2.

## 11. Riscos atuais

- ativar recovery sem scheduler, lease e metricas operacionais adequadas;
- interpretar 5xx ou timeout como prova de ausencia e duplicar mensagem;
- tratar ack do POST como entrega final;
- usar ausencia em pagina Chatwoot como prova conclusiva;
- recuperar payload historico cuja equivalencia nao pode ser demonstrada;
- confirmar handoff com apenas o 2xx da mutacao, sem leitura remota;
- assumir inbox sem assignee/team como destino humano;
- reativar a IA automaticamente depois de falha remota de handoff;
- repetir mutacao de handoff parcial por duplicate do webhook;
- permitir que outro branch volte a enviar fora do executor unico;
- alterar controle sem incrementar `controlRevision`;
- expor segredo, payload ou conteudo integral no manifesto;
- ativar Runtime V2 como caminho concorrente.

## 12. Continuidade

O proximo bloco deve ser autorizado separadamente. Ate essa autorizacao:

- nao ativar o coordinator de recovery;
- nao iniciar o Bloco 4B;
- nao alterar os quatro gaps funcionais restantes;
- nao automatizar recovery de handoff parcial;
- nao ativar Runtime V2;
- usar os relatorios dos blocos como fonte de contrato e evidencia.

## Registro historico: AI-007 - logs seguros de runtime

A AI-007 adicionou logs de execucao do runtime de IA sem salvar prompt completo, API key ou payload bruto de provider.

O runtime agora cria um registro seguro para cada mensagem processada com sucesso operacional, incluindo:

- `mode`, `status`, `provider`, `model` e `configurationSource`
- `fallback`, `fallbackReason` e `outcome`
- `durationMs`
- erro sanitizado do provider quando existir
- contadores de contexto como `knowledgeCount`, `historyMessagesUsed` e `historyLimit`
- flags `initialMessageIncluded` e `instructionsIncluded`
- ids internos de rastreio de assistant, conversa e mensagens

Os endpoints `GET /logs/ai` e `GET /logs/ai/:id` exigem `logs:read` e sempre filtram pelo tenant atual.

Naquele marco ainda estavam fora do escopo:

- tokens/custos/tracing avancado
- dashboards agregados
- RAG vetorial
- embeddings
- tools/functions
- canais externos

Ordem historica sugerida naquele momento:

1. AI-008 - knowledge e RAG simples
2. BE-022 - CRUD inicial de Tools
3. AI-009 - canais externos
4. AI-010 - observabilidade avancada de tokens, custo e tracing

Essa lista foi superada pelas entregas posteriores e nao representa a
prioridade atual.
