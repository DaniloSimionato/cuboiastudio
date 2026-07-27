# Fase 3 de 3 — Bloco 5A

## 1. Integridade e isolamento

Baseline aprovado:

`59dd68d574560ca208615a4a8edbadf90fc3c58b`

Ambiente isolado:

- worktree:
  `/Users/danilosimionato/Projetos/CuboIAStudio-policy-block5a`;
- branch: `feat/unified-policy-block5a-integral-evidence`;
- Runtime V1 preservado com policy `V1_COMPATIBILITY_POLICY`;
- Runtime V2 permanece OFF;
- PostgreSQL, Redis, Chatwoot fake e provider fake usados nos testes são locais,
  loopback-only e descartáveis;
- nenhuma consulta ou mutação foi realizada em staging;
- nenhuma mensagem foi enviada a um serviço real;
- não houve alteração em schema Prisma ou migration.

O repositório principal permaneceu fora do escopo de escrita. Seu HEAD e seu
diff tracked não foram modificados pelo Bloco 5A. Alterações locais e arquivos
não rastreados pertencentes ao usuário foram preservados.

Gate funcional e de regressão:

- harness HTTP: **31 passed, 0 failed e 3 `todo`**;
- regressão relacionada: **310 passed e 0 failed**;
- build fresco:
  `abd659d950f5f2e3620d44d493424477c83de23c6d5e96c3d79d65b2041f6ef0`;
- timestamp do artefato:
  `2026-07-27T13:23:49.942Z`.

O commit e o push são evidenciados no histórico Git e no entregável final,
pois um commit não pode registrar o próprio hash sem reescrever seu conteúdo.
Este relatório não representa merge ou deploy.

## 2. Auditoria de truncamento

O inventário encontrou quatro categorias diferentes de corte:

| Ponto | Comportamento anterior | Consumidor | Risco | Contrato do Bloco 5A |
|---|---|---|---|---|
| retrieval | `substring(0, 250)` era exposto ao runtime como `contentPreview` | RAG, autoridade, prompt e logs | o preview passava a ser a única cópia textual disponível | runtime recebe artefato factual integral e preview separado |
| autoridade de preço | extraía sobre o campo genérico `content` recebido do RAG | decisão determinística e guard de preço | preço posterior ao caractere 250 desaparecia | exige `FactualEvidenceArtifact` válido e lê `canonicalContent` |
| prompt | conhecimento genérico podia chegar já truncado | provider | fato distante era omitido sem cobertura rastreável | recebe `ProviderEvidenceExcerpt` limitado, com offsets e cobertura |
| observabilidade | previews curtos eram serializados em diagnóstico | logs e telas | seguro para volume, mas não para decisão | permanece preview, sem autoridade factual |

Também existem cortes de histórico, inbound, erros e texto de runtime não
relacionados à evidência canônica. Eles não foram alterados. O limite defensivo
de 10.000 caracteres do Prompt Compiler permanece, porém o Runtime V1 ativo
agora entrega excerpts com no máximo 1.600 caracteres cada e 4.800 no total.

Não foram encontrados consumers factuais ativos usando somente os primeiros
250 caracteres depois da migração. O caminho público de busca continua
devolvendo apenas preview para não expor o chunk integral.

## 3. Contratos de evidence

O contrato `knowledge-evidence-v1` separa estruturalmente:

1. `CanonicalKnowledgeContent`: texto completo carregado da tabela canônica,
   branded e efêmero;
2. `FactualEvidenceArtifact`: identidade, hash, tamanho, score, motivo de
   seleção, spans factuais e candidatos de autoridade, mantendo referência ao
   conteúdo canônico apenas durante a execução;
3. `ProviderEvidenceExcerpt`: transporte limitado, com offsets, anchors,
   spans, budget, truncamento e cobertura;
4. `EvidencePreview`: observabilidade sanitizada, com a propriedade distinta
   `previewText` e sem campo genérico `content`.

Builders e validadores diferentes impedem que preview satisfaça os contratos
de autoridade ou de provider. O extractor de preço rejeita objetos que não
sejam artefatos factuais íntegros. O Prompt Compiler rejeita qualquer item
tipado que não seja um `ProviderEvidenceExcerpt` válido.

Os objetos são congelados logicamente durante a execução. Hash SHA-256 e
offsets permitem correlacionar o excerpt com a fonte sem persistir novamente o
texto integral.

## 4. Retrieval e cache

`AssistantKnowledgeRetrievalService` agora oferece dois contratos:

- `searchRelevantKnowledgeForRuntime`: interno, com artefato factual integral e
  preview;
- `searchRelevantKnowledge`: projeção pública compatível, contendo somente
  `contentPreview`.

Ranking, scopes, tags, threshold, top K e modelo de embedding foram preservados.
O conteúdo canônico dos chunks selecionados continua sendo carregado do
PostgreSQL.

O cache existente é usado somente para o vetor da consulta, sob chave
versionada com IDs técnicos, modelo e hash da consulta. Não existe cache novo
de resultado RAG ou de conteúdo. Em cache hit, os chunks canônicos são
recarregados do PostgreSQL, portanto hit e miss possuem a mesma evidência
factual.

O teste PostgreSQL comprova:

- primeira consulta com cache miss;
- segunda consulta com cache hit;
- somente uma geração de embedding;
- mesmo chunk, hash, autoridade e decisão;
- preço depois do caractere 800 ausente do preview e presente no artefato
  factual.

## 5. Autoridade factual

`extractRagPriceAuthorities` aceita somente `FactualEvidenceArtifact` e procura
os preços no conteúdo canônico integral. O extractor registra offsets do span,
preserva qualifier e evita tratar o ponto de milhar de um preço como fim de
sentença.

A precedência, filtragem por serviço, deduplicação, conflito e fail-closed já
existentes foram preservados. A mudança não hardcodeia preço, posição de
caractere, ID de fixture ou decisão por placa-mãe.

Controles executáveis comprovaram:

- consulta explícita de placa-mãe com o fato depois do caractere 250;
- a mesma consulta com o fato depois do caractere 800;
- `serviceKey=placa_mae`;
- BRL 395;
- `qualifier=starting_at`;
- decisão `DETERMINISTIC_PRICE_AUTHORITY`;
- zero geração final;
- uma decisão e um outbound reconhecido.

O controle de formatação permaneceu BRL 1950, `starting_at`, com zero geração
final e o mesmo texto.

## 6. Provider excerpts e orçamento

O empacotamento segue esta ordem:

1. recupera o conteúdo integral;
2. seleciona os chunks pelo ranking existente;
3. extrai autoridades e spans factuais;
4. combina anchors do turno e das autoridades;
5. constrói janelas com contexto anterior e posterior;
6. une spans próximos;
7. aplica budget por chunk e global;
8. entrega somente excerpts tipados ao Prompt Compiler.

Budget padrão:

- máximo de 5 chunks;
- máximo de 1.600 caracteres por excerpt;
- máximo de 4.800 caracteres no conjunto;
- máximo de 4 spans por chunk;
- 180 caracteres antes e 320 depois do anchor;
- união de spans separados por até 48 caracteres.

Os excerpts preservam offsets de origem e de destino, anchors, status de
truncamento e cobertura factual. O provider não recebe uma chamada adicional
para resumir knowledge. A decisão determinística continua usando autoridade
extraída antes do empacotamento e não depende de o fato caber no excerpt.

## 7. Guards

O guard de preço continua consumindo a autoridade estruturada selecionada. A
fonte dessa autoridade passou a ser o artefato factual integral, e não o
preview.

O fallback determinístico legado recebe somente spans factuais selecionados a
partir do artefato canônico. Ele não recebe o excerpt de transporte do
provider. O Runtime V1 ativo também passa `knowledgeItems=[]` ao caminho
genérico do Prompt Compiler e fornece facts exclusivamente por
`providerEvidenceItems` tipado. Os inputs genéricos permanecem apenas como
compatibilidade de callers legados, inclusive Runtime V2 desligado.

O Bloco 5A não redesenhou guards de agenda, handoff, completude ou estado. Seus
contratos aprovados permanecem intactos. Em particular:

- BusinessHours reconhecido conserva detector, precedência e renderer;
- o provider permanece sem autoridade para contradizer preço oficial;
- conflito de autoridades não é resolvido pela ordem textual do preview;
- ausência de cobertura no excerpt não autoriza invenção factual.

## 8. Manifesto e sanitização

O owner canônico permanece:

`AssistantRuntimeLog.metadata.turnExecutionManifest`

O resumo `evidence` registra somente:

- schema;
- status do cache de embedding;
- IDs, hashes, tamanhos, scores e motivos de seleção;
- tamanhos e truncamento dos previews;
- offsets e razões dos spans;
- budget, tamanhos, offsets, anchors e cobertura dos excerpts;
- contagem de autoridades candidatas e elegíveis;
- autoridade selecionada com campos comerciais sanitizados.

Não são persistidos:

- chunk canônico integral;
- preview textual;
- excerpt textual;
- prompt completo;
- telefone;
- token;
- headers;
- knowledge integral;
- response body externo.

Mensagens, ledger de outbound e operações de handoff não recebem cópia do
manifesto nem do conteúdo factual.

## 9. Arquivos alterados

Produção:

- `apps/api/src/assistant-knowledge/knowledge-evidence.ts`: contratos,
  builders, anchors, spans, budgets e validação;
- `apps/api/src/assistant-knowledge/assistant-knowledge-retrieval.service.ts`:
  transporte factual interno, projeção pública e cache de vetor;
- `apps/api/src/assistant-conversations/runtime-context-manifest.ts`: resultado
  de retrieval tipado;
- `apps/api/src/assistant-conversations/rag-price-authority.ts`: extração sobre
  conteúdo integral e offsets;
- `apps/api/src/assistant-conversations/assistant-conversations.service.ts`:
  integração mínima de evidence, autoridade, provider pack e manifesto;
- `apps/api/src/prompt-compiler/prompt-compiler.service.ts`: entrada tipada de
  excerpts;
- `apps/api/src/assistant-conversations/turn-execution-manifest.ts`: resumo
  sanitizado de evidence;
- `apps/api/src/assistants/assistants.service.ts`: preview administrativo
  preservado e compilação limitada.

Testes e harness:

- `apps/api/test/integral-knowledge-evidence.test.mjs`;
- `apps/api/test/rag-price-authority.test.mjs`;
- `apps/api/test/flow-scoped-rag-retrieval.test.mjs`;
- `apps/api/test/flow-scoped-rag-retrieval-postgres.test.mjs`;
- `apps/api/test/turn-execution-manifest.test.mjs`;
- `apps/api/test/production-http-harness.test.mjs`;
- `apps/api/test/helpers/production-fixtures.mjs`;
- `apps/api/test/helpers/run-production-http-harness.mjs`;
- mocks factuais ajustados em
  `assistant-calendar-tools.test.mjs`,
  `assistant-flow-tool-scope.test.mjs`,
  `business-hours-direct-deterministic.test.mjs`,
  `chatwoot-webhook-and-runtime.test.mjs` e
  `split-response-style.test.mjs`;
- `apps/api/test/README.production-http-harness.md`;
- este relatório.

Documentação oficial:

- `docs/AI_CONTEXT.md`;
- `docs/AI_RUNTIME_PLAN.md`;
- `docs/CUBOCHAT_INTEGRATION.md`.

Não houve alteração em schema, migration, frontend, endpoints públicos,
modelo, temperatura, Intent Router, Flow Router, configuração comercial ou
Runtime V2.

## 10. Testes e regressões

Cobertura nova:

- 7 testes unitários do contrato integral, incompatibilidade de preview,
  anchors, spans, budget global e cobertura parcial;
- extração de preço depois do caractere 800;
- autoridade integral preservada quando o excerpt do provider omite o fato;
- cache miss/hit com PostgreSQL real e conteúdo canônico equivalente;
- manifesto sanitizado;
- consulta HTTP explícita de placa-mãe depois dos caracteres 250 e 800;
- caminho provider com excerpt limitado e offsets rastreáveis;
- chunk grande e dois chunks com ranking/conflito preservados;
- regressão de formatação, BusinessHours, handoff, outbound recovery,
  controle, tools e Runtime V2.

Resultado final:

```text
HTTP harness
tests: 34
passed: 31
failed: 0
todo: 3

related suite
tests: 310
passed: 310
failed: 0
```

Os três `test.todo` restantes são:

1. erro ortográfico `atendiemnto`;
2. continuidade de preço entre turnos;
3. computador lento e completude comercial.

O antigo gap de evidência após 250 caracteres tornou-se teste executável. A
consulta de placa-mãe usada neste bloco contém intenção explícita no próprio
turno e não antecipa continuidade multi-turno.

## 11. Paridade funcional

Nos controles já corretos:

- textos e status HTTP permaneceram iguais;
- formatação permaneceu BRL 1950 e `starting_at`;
- contagens de geração final e outbound permaneceram iguais;
- payload e external message ID do Chatwoot permaneceram iguais;
- handoff operacional e seus recoveries permaneceram iguais;
- delivery ledger, retry safety, controle CAS e reset permaneceram iguais;
- BusinessHours reconhecido permaneceu igual;
- Runtime V2 permaneceu OFF.

A mudança funcional deliberada limita-se a disponibilizar fatos que existiam
no conteúdo canônico, mas estavam depois do preview, permitindo a resposta
determinística de placa-mãe BRL 395 em consulta explícita.

O cache de vetor elimina somente uma segunda chamada de embedding para consulta
idêntica no teste específico de cache; não altera ranking, evidência ou
provider final.

## 12. Validações

Executadas no worktree isolado:

```text
npx --no-install prisma generate
npx --no-install tsc -p tsconfig.json --noEmit
npm run build
node --test --test-concurrency=1 \
  test/integral-knowledge-evidence.test.mjs \
  test/rag-price-authority.test.mjs \
  test/flow-scoped-rag-retrieval.test.mjs \
  test/turn-execution-manifest.test.mjs \
  test/assistant-behavior-prompt.test.mjs
npm run test:http-harness
node --check <todos os .mjs/.cjs alterados ou criados>
git diff --check
git diff --cached --check
```

Resultados:

- Prisma Client gerado a partir do schema já existente;
- TypeScript e build aprovados;
- suíte focada: 35 passed, 0 failed;
- harness e regressões: 31 HTTP passed, 3 `todo`, 310 related passed;
- build fresco validado pelo hash e timestamp registrados na seção 1;
- nenhuma migration nova ou alterada;
- varredura de dados sensíveis aprovada;
- API, fakes, portas e containers descartáveis encerrados no teardown;
- diff staged revisado antes do commit.

## 13. Commit e push

Mensagem obrigatória:

`fix: preserve integral factual evidence beyond previews`

O hash, a branch publicada e a confirmação do push constam no entregável final
e no histórico Git. Não houve merge, deploy ou alteração em `main`.

## 14. Estado final

Após os gates Git:

- worktree do Bloco 5A limpo;
- repositório principal preservado;
- staging intocado;
- Runtime V2 OFF;
- três gaps funcionais permanecem abertos;
- Bloco 5B não iniciado.
