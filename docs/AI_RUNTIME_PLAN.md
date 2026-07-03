# AI_RUNTIME_PLAN.md

Plano tecnico do cerebro da IA do Cubo AI Studio.

Este documento define a evolucao do runtime mantendo fallback deterministico, seguranca de secrets e separacao clara entre provider, assistant, knowledge, pipeline, logs, tools e canais.

## 1. Estado atual

- A demo visual esta valida e conectada ao backend local nas telas principais.
- O backend local esta validado com banco real, auth dev, tenant, RBAC, assistants, knowledge, preview, runtime e logs.
- O runtime de conversa ja tenta IA real quando a configuracao por tenant ou `.env` esta habilitada e valida.
- O fallback deterministico continua oficial para desenvolvimento, smoke e resiliencia.
- AI-001 ja adicionou a camada backend-only de provider real e o diagnostico seguro.
- AI-002 ja persistiu `instructions`, `model` e `temperature` no Assistant e expôs isso com seguranca nas rotas e na UI.
- AI-003 ja ligou o runtime de conversa ao provider real com fallback deterministico.
- AI-004 agora adicionou configuracao de IA por tenant/empresa, com API key cifrada e fallback global seguro.
- AI-005 agora iniciou o Runtime Pipeline v1 com as 7 partes do assistente na UI de testes.
- AI-006 agora melhora o contexto de conversa enviado ao provider e exibido no debug, incluindo identidade do assistant, mensagem inicial, instrucoes/persona e historico recente.
- O frontend nao chama provedores externos diretamente.
- O smoke oficial nao depende de IA real.
- As conversas persistidas e os logs atuais servem como base para evolucao.

## 2. Problema atual

Hoje existe uma demo funcional com provider real opcional, mas o fluxo ainda precisa ficar mais explicito para operadores e implantacao.

As respostas ja podem passar pelo provider configurado, porem o usuario precisa enxergar melhor quais partes formam o comportamento do assistente.

Isso cria tres limites:

- o debug precisa mostrar claramente instrucoes, contexto, modelo, modo e saida
- o resumo da execucao ainda e simples e nao persistido como memoria
- tools, canais, embeddings e observabilidade avancada seguem fora do runtime v1

## 3. Objetivo do cerebro da IA

Criar uma base tecnica para que o Cubo AI Studio consiga alternar entre:

- runtime deterministico de fallback
- runtime real de IA

O objetivo nao e abandonar o modo deterministico.
O objetivo e adicionar uma camada real, segura e observavel sem quebrar a demo, o smoke ou o desenvolvimento local.

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

O envio de mensagem deve seguir a ordem abaixo:

1. salvar a mensagem do usuario
2. montar o contexto
3. consultar o provider de IA, se habilitado
4. salvar a resposta do assistant
5. retornar a resposta para a UI

Se o provider estiver desabilitado ou falhar de forma controlada, o runtime deterministico continua como fallback.

### 4.4 Fallback deterministico

O runtime deterministico deve continuar existindo para:

- desenvolvimento local
- demo offline
- smoke test
- fallback de resiliencia

Ele nao deve ser removido nem substituido antes do runtime real estar validado.

### 4.5 Logs e observabilidade

O runtime real deve registrar:

- modo usado
- provider
- modelo
- tempo de resposta
- erro controlado
- tokens, quando existirem
- custo estimado, quando aplicavel

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

O conhecimento precisa evoluir em camadas:

- selecao melhor de contexto
- limite de tamanho
- preparacao para embeddings
- futura busca semantica

Nesta fase nao entram embeddings nem vetorizar tudo imediatamente.

### 4.7 Tools e functions

As tools reais entram depois da IA basica existir.

Elas devem ficar atraves de uma interface segura do backend para:

- consultar ordem de servico
- consultar boleto
- consultar pedido
- chamar webhook
- transferir humano
- adicionar tag

### 4.8 Canais externos

Os canais externos so devem entrar depois do runtime estar estavel.

Exemplos:

- WhatsApp
- Cubo.Chat
- webhooks de entrada
- outros canais externos

## 5. Sequencia de implementacao

Sequencia sugerida:

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

## 9. Como sera testado

Quando a implementacao comecar, os testes devem cobrir:

- smoke local sem dependencia de API key real
- runtime com provider desabilitado
- runtime com provider habilitado em ambiente controlado
- persistencia de mensagem de usuario e assistant
- retorno de modo, provider, modelo, temperatura, outcome e resumo
- comportamento de fallback controlado

O comando oficial de validacao continua sendo:

```bash
npm run build
npm run lint
npm exec tsc -- --noEmit -p tsconfig.json
```

O smoke deve continuar local e deterministico ate a nova integracao estar madura.

## 10. O que nao entra agora

Nao entra nesta fase do Runtime Pipeline v1:

- API key real
- embeddings
- RAG vetorial
- tool execution real
- canais externos reais
- Webhook de producao
- timer real de inatividade
- resumo persistido avancado
- saida condicional real
- observabilidade avancada de tokens/custos/tracing

## 11. Riscos

- misturar provider real com fallback pode esconder falhas se os logs forem fracos
- expor segredo no frontend quebraria a arquitetura de seguranca
- adicionar tools antes da IA basica pode complicar o runtime sem necessidade
- introduzir embeddings cedo demais pode aumentar custo e complexidade
- tentar integrar canais antes do runtime estabilizar pode gerar debito tecnico

## 12. Proximas issues sugeridas

1. AI-007 - logs e observabilidade de IA
2. AI-008 - knowledge e RAG simples
3. BE-022 - CRUD inicial de Tools
4. AI-009 - canais externos

Essa ordem prioriza a base real de IA antes de ampliar integracoes.

## AI-007 entregue - logs seguros de runtime

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

Continua fora do escopo:

- tokens/custos/tracing avancado
- dashboards agregados
- RAG vetorial
- embeddings
- tools/functions
- canais externos

Proxima ordem sugerida:

1. AI-008 - knowledge e RAG simples
2. BE-022 - CRUD inicial de Tools
3. AI-009 - canais externos
4. AI-010 - observabilidade avancada de tokens, custo e tracing
