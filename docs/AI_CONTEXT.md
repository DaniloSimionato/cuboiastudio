# AI_CONTEXT.md

Documento de contexto permanente para qualquer IA que participe do desenvolvimento do Cubo AI Studio.

Este documento existe para que qualquer agente entenda o negocio antes de entender o codigo.

## 1. O que e a Cubo.Chat

A Cubo.Chat e uma plataforma omnichannel de atendimento.

Hoje ela integra canais como:

- WhatsApp Oficial
- WAHA
- UAZAPI
- Instagram
- Facebook
- Webchat

No futuro, outros canais poderao ser adicionados.

A Cubo.Chat e o centro de toda comunicacao.

A IA nunca conversa diretamente com os canais.

Toda comunicacao entra e sai pela Cubo.Chat.

## 2. O que e o Cubo AI Studio

O Cubo AI Studio e o modulo oficial de Inteligencia Artificial da Cubo.Chat.

Seu objetivo e permitir que empresas configurem Assistentes IA capazes de atender clientes utilizando:

- prompts estruturados
- base de conhecimento
- memoria
- ferramentas
- webhooks
- fluxos
- integracoes

Inicialmente, o uso sera interno pela equipe de implantacao.

No futuro, o sistema podera ser liberado para clientes finais.

## 3. Qual problema estamos resolvendo

Historicamente, muitos clientes utilizaram IA baseada apenas em prompts
enormes.

Isso gera:

- alucinacao
- respostas inconsistentes
- dificil manutencao
- dependencia de pessoas especificas
- perda de clientes
- baixa confiabilidade

O Cubo AI Studio nasce para resolver exatamente esse problema.

O estado operacional atual ja possui conversa persistida, provider real,
embeddings, recuperacao de knowledge, flows, tools e integracao Chatwoot. O
runtime ativo em producao continua sendo o Runtime V1. Runtime V2 permanece
explicitamente desligado.

O caminho principal validado e:

`POST /webhooks/chatwoot -> inbound canonico -> conversa interna -> Runtime V1 -> decisao selada -> executor unico -> persistencia -> ledger outbound -> sender Chatwoot`

O Runtime V1 preserva respostas deterministicas quando existe autoridade
obrigatoria, como BusinessHours reconhecido e preco oficial inequivoco, e usa o
provider para respostas abertas. Knowledge scopes, filtro por tags, flow
routing, RAG, autoridades comerciais, guards de preco e isolamento por
`currentContextVersion` continuam ativos.

Os blocos de estabilizacao arquitetural foram concluidos ate o Bloco 5B. A
preservacao de evidencia factual integral no Runtime V1 foi validada localmente
pelo harness real:

- Bloco 0: harness HTTP pelo mesmo `AppModule`, bootstrap e webhook da producao;
- Bloco 1: `turnExecutionId`, policy version e manifesto sanitizado;
- Bloco 2: uma decisao terminal selada e um executor unico por turno;
- Bloco 3A: `controlRevision`, snapshots, checkpoints e bloqueio de turno stale;
- Bloco 3B.1: ledger duravel antes da fronteira outbound e claim unico;
- Bloco 3B.2: retry safety, leases, tentativas, recovery e reconciliacao segura;
- Bloco 4A: handoff humano operacional fail-closed, com operacao persistida,
  bloqueio local por CAS, mutacao e verificacao remotas antes da confirmacao;
- Bloco 4B: recovery de operacoes parciais de handoff com safety separado,
  attempts duraveis, lease, GET-first e confirmacao idempotente pelo ledger;
- Bloco 5A: contratos separados para conteudo canonico, artefato factual,
  excerpt limitado do provider e preview exclusivamente observacional.
- Bloco 5B: estado minimo e duravel de intencao de preco e servico ativo,
  restrito ao turno adjacente e invalidado por contexto, revisao ou assunto.

No handoff explicito, o Runtime V1 nao trata mais o texto de transferencia como
prova da operacao. A sequencia e:

`decisao operacional -> operacao persistida -> bloqueio local -> GET remoto -> PUT ai_active=false -> GET de verificacao -> confirmacao via ledger`

A confirmacao visivel so e autorizada quando o Chatwoot confirma a conversa
correta, a IA remota inativa, status compativel e um destino humano ja
existente. Neste bloco, os unicos destinos comprovados sao o assignee existente
e, na ausencia dele, o team existente. Inbox sem assignee ou team nao e tratada
como fila humana comprovada.

Se o processo parar no meio do handoff, o recovery continua a operacao
existente sem criar outra decisao. `REMOTE_PENDING` e
`RECONCILIATION_REQUIRED` sempre executam GET antes de qualquer nova mutation.
Mutation so pode ser repetida com `HandoffRecoverySafety` igual a
`PROVEN_SAFE`, budget, backoff, lease e controle local ainda validos. Um
destino humano diferente pode ser aceito como intervencao externa quando
continua valido; destino removido nao e inventado nem restaurado.

Um ack do POST ao Chatwoot significa `ACKNOWLEDGED`; ele nao prova entrega final
ao usuario. O runner periodico de handoff existe, mas fica OFF por padrao por
`HANDOFF_RECOVERY_ENABLED=false` e e bloqueado mesmo com a flag ligada em
`staging` e `production`. Nao existe endpoint publico de recovery. Em ambiente
controlado, o runner impede sobreposicao e encerra de forma limpa.

Retries so podem ocorrer quando a ausencia de efeito remoto e tecnicamente
comprovada. `UNCERTAIN` nunca e reenviado diretamente. A reconciliacao atual
aceita apenas evidencia positiva por external message ID ou pela referencia
tecnica exata preservada em `content_attributes`; ausencia em lista paginada e
inconclusiva.

Knowledge selecionado pelo Runtime V1 agora preserva o
`AssistantKnowledgeChunk.content` integral em um artefato factual efemero.
Authority Resolver e guards consomem o artefato ou a autoridade estruturada,
nunca o preview. O provider recebe somente excerpts limitados, construidos
depois da extracao factual, com offsets, anchors, coverage e budget
rastreaveis. O preview de 250 caracteres continua disponivel para diagnostico,
mas nao concede autoridade. Manifesto e logs guardam apenas IDs, hashes,
tamanhos, offsets, coverage e campos comerciais sanitizados.

O plano tecnico do "cerebro" da IA esta sendo documentado em `docs/AI_RUNTIME_PLAN.md` para separar com clareza provider, prompt, runtime, logs, knowledge, tools e canais.

AI-001 agora criou a primeira camada backend-only de provider real com diagnostico seguro, e AI-003 passou a ligar o runtime de conversa ao provider quando a configuracao permite, mantendo fallback deterministico.
AI-002 agora persistiu `instructions`, `model` e `temperature` no Assistant e tornou essas configuracoes editaveis na UI.
AI-004 agora adicionou configuracao de IA por tenant/empresa na tela de configuracoes, com API key cifrada no backend e fallback global apenas quando o tenant nao possui configuracao propria.
AI-005 agora iniciou o Runtime Pipeline v1 baseado em 7 partes do Assistente: mensagem inicial, instrucoes, contexto, modelo/temperatura, inatividade, saida e resumo. A tela `/testes` mostra essas partes no debug, e novas conversas podem receber `initialMessage` persistida como mensagem inicial do assistant.

O endpoint `GET /diagnostics/ai` existe apenas para inspeção segura e teste manual.
As rotas `GET /settings/ai`, `PATCH /settings/ai`, `POST /settings/ai/test` e `DELETE /settings/ai/api-key` atendem a configuracao de tenant e exigem `settings:read` ou `settings:write` conforme o caso.

BE-022 continua reservado para Tools no backlog oficial.
BE-023 ja criou a estrutura inicial de conversas e mensagens persistidas do runtime, que agora pode operar com IA real no backend ou com fallback deterministico seguro.
A integraçao de IA real no `/testes` agora pode acontecer pelo runtime de conversa quando o backend estiver habilitado, mas continua segura e dependente da configuracao backend-only.
A AI-005 foi um marco historico anterior a Tools, canais externos, embeddings e
RAG. Essas capacidades foram adicionadas em etapas posteriores; seu texto nao
deve ser usado como descricao do runtime atual.
A demo local também foi estabilizada para as portas comuns do Vite em desenvolvimento, sem alterar o comportamento determinístico nem introduzir IA real.

Documentos operacionais atuais:

- `apps/api/test/README.production-http-harness.md`;
- `apps/api/test/BLOCK3B2_OUTBOUND_RECOVERY_REPORT.md`;
- `apps/api/test/BLOCK4A_OPERATIONAL_HANDOFF_REPORT.md`;
- `apps/api/test/BLOCK4B_HANDOFF_RECOVERY_REPORT.md`;
- `apps/api/test/BLOCK5A_INTEGRAL_EVIDENCE_REPORT.md`;
- `docs/CUBOCHAT_INTEGRATION.md`.

## 4. Objetivo do MVP

O MVP possui um unico objetivo:

Permitir que clientes da Cubo.Chat utilizem uma IA confiavel em producao.

Nao tentar resolver todos os problemas do mercado.

Nao criar uma plataforma generica.

O foco e atender muito bem os clientes atuais.

## 5. Quem utilizara o sistema

### Administrador

- administra a plataforma
- acompanha configuracoes globais
- supervisiona seguranca, custos e operacao

### Equipe de Implantacao

- configura assistentes
- cria conhecimento
- ajusta fluxos
- valida a entrega para cada cliente

### Equipe de Suporte

- acompanha logs
- investiga falhas
- ajuda na manutencao operacional

### Cliente Administrador

- futuro perfil de acesso
- podera configurar seus proprios assistentes
- podera gerenciar sua operacao com autonomia controlada

### Parceiros

- futuro perfil de acesso
- podera auxiliar implantacoes e operacoes autorizadas

## 6. Como funciona hoje

O runtime atual possui uma base de controle e auditoria significativamente mais
forte, mas ainda conserva limitacoes funcionais conhecidas:

- erro ortografico `atendiemnto` ainda pode escapar de BusinessHours direto;
- resposta tecnica sobre computador lento ainda pode ficar generica;
- divergencia remota de pausa sem atualizacao local ainda nao e detectada;
- recovery outbound nao possui um scheduler independente;
- o runner de handoff permanece desabilitado por padrao e proibido em
  staging/producao neste bloco.

Os dois gaps funcionais permanecem visiveis como especificacoes `test.todo`.
A perda de evidencia depois dos caracteres 250 e 800 deixou de ser `todo` e
passou a possuir cobertura HTTP executavel. A continuidade de preco tambem
passou a ser executavel para os dois follow-ups aprovados.

O gate final do Bloco 5B passou 35 cenarios HTTP executaveis, manteve 2
especificacoes `todo` e passou 313 testes relacionados. O conjunto fresco de
artefatos V1 possui SHA-256
`13691ffbd0c44f77858c498d902d73fe223d084db48841cb90e45698edc1c33f`.
Runtime V2 permanece OFF.

## 7. Como queremos que funcione

A visao futura desejada e:

Empresa

Assistentes

Conhecimento

Ferramentas

Fluxos

Canais

IA

Logs

Consumo

Tudo integrado ao Cubo.Chat.

## 8. Filosofia do Produto

O Cubo AI Studio deve ser:

- simples
- previsivel
- confiavel
- escalavel
- seguro
- modular

Nunca depender de um unico provider de IA.

Nunca depender de uma unica integracao.

## 9. Como a IA deve pensar

Ao tomar decisoes, a IA deve priorizar sempre:

Seguranca

Confiabilidade

Manutencao

Escalabilidade

Performance

Novas funcionalidades

Nunca sacrificar arquitetura para implementar rapidamente uma feature.

## 10. Como decisoes devem ser tomadas

Em caso de duvida, a IA deve se perguntar:

- Essa decisao ajuda o MVP?
- Ajuda clientes atuais?
- Reduz churn?
- Facilita implantacao?
- Aumenta confiabilidade?

Se a resposta for nao, a funcionalidade provavelmente deve ficar para depois.

## 11. O que nao faz parte do MVP

Nao faz parte do MVP:

- Marketplace
- Billing automatico
- Marketplace de Skills
- Flow Builder avancado
- Analytics avancado
- Builder liberado para cliente final
- Integracoes complexas
- Multi-provider avancado
- Automações complexas
- Multi-tenant extremamente avancado

Tudo isso ficara para versoes futuras.

## 12. Visao de longo prazo

Futuramente, o Cubo AI Studio pode evoluir para uma plataforma independente de criacao de Assistentes IA.

Por enquanto, essa nao e a prioridade atual.

A prioridade absoluta e fortalecer a Cubo.Chat.

## 13. Principio mais importante

O objetivo do Cubo AI Studio nao e impressionar com quantidade de funcionalidades.

O objetivo e entregar uma IA confiavel, previsivel e facil de implantar para os clientes da Cubo.Chat.

Toda decisao tecnica deve respeitar este principio.

## 14. Como qualquer IA deve atuar neste projeto

Toda IA deve:

- Ler primeiro toda a documentacao
- Respeitar `PROJECT_RULES.md`
- Respeitar `BACKEND_ISSUES.md`
- Respeitar `BACKEND_BACKLOG.md`
- Nunca alterar arquitetura sem justificativa
- Nunca implementar funcionalidades fora da issue atual
- Sempre explicar decisoes importantes
- Sempre priorizar simplicidade para o MVP
- Sempre considerar que o projeto sera mantido por varios desenvolvedores e IAs ao longo dos anos

## 15. Mensagem Final

Este projeto deve ser tratado como um produto de longo prazo.

O codigo deve ser escrito para durar muitos anos.

A documentacao e parte do produto.

A arquitetura e prioridade.

A seguranca e obrigatoria.

A escalabilidade e esperada.

A confiabilidade e o principal diferencial competitivo da Cubo.Chat.
