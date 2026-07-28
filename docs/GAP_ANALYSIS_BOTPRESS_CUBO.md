# Lacunas práticas: Botpress × Cubo AI Studio

## Leitura executiva

O Cubo já possui a base necessária para entregar uma IA configurável: runtime por empresa, painel do agente, RAG textual, memória por contato, chat de teste, canais Chatwoot, logs, consumo e RBAC. A principal lacuna não é reconstruir o Studio: é fechar o ciclo operacional de **validar → publicar com segurança → observar → transferir para humano**.

Esta análise é estática e considera apenas o Cubo atual e o relatório `docs/ANALISE_BOTPRESS_PARA_CUBO.md`. Não reavalia os repositórios Botpress.

## Matriz das 15 ideias

| # | Ideia | Situação | Evidência atual no Cubo | Lacuna prática / decisão |
|---|---|---|---|---|
| 1 | Página inicial de configuração do agente | **EXISTE PARCIALMENTE** | Formulário amplo em `src/routes/_app.agentes.novo.tsx`; persistência e execução em `apps/api/src/assistants/assistants.service.ts`; comportamento em `src/components/assistant/AssistantBehaviorTab.tsx`. | Já configura objetivo, instruções, modelo, tom, horário, memória, RAG, regras, ferramentas e canais. Falta um início guiado e uma prontidão única que bloqueie publicação quando houver pendências. |
| 2 | Canvas de workflows reutilizáveis | **ADIAR** | Protótipo visual isolado em `src/routes/_app.flow.tsx`; fluxos reais por formulário em `src/components/assistant/AssistantFlowsTab.tsx` e `apps/api/src/assistant-flows/assistant-flows.service.ts`. | O canvas não persiste nem é o contrato executado pelo runtime. Não reconstruir agora; os fluxos declarativos atuais bastam para a entrega. |
| 3 | Nós determinísticos e IA com limites | **ADIAR** | Fluxos têm gatilhos, instruções, escopo de conhecimento, ferramentas permitidas e ação final em `apps/api/prisma/schema.prisma` (`AssistantFlow`) e `apps/api/src/assistant-flows/assistant-flows.service.ts`; runtime avalia fluxos em `apps/api/src/assistant-conversations/`. | Há um equivalente por configuração, não por nós executáveis no canvas. Manter o modelo atual e tratar o editor de nós como evolução conjunta do item 2. |
| 4 | Catálogo de ferramentas configuráveis | **EXISTE PARCIALMENTE** | Apps/instalações/credenciais em `apps/api/prisma/schema.prisma`; permissões por ferramenta em `AssistantToolConfig`; painel em `src/components/assistant/AssistantToolsTab.tsx`; webhook customizado em `CustomWebhookAction` e rota `src/routes/_app.apps.custom-webhook.tsx`. | Há Calendar e Webhook, com leitura/escrita, confirmação e timeout. Falta um catálogo único orientado por contrato, finalidade e diagnóstico uniforme para cada conector. |
| 5 | Formulários, credenciais isoladas e ambientes | **EXISTE PARCIALMENTE** | Segredos cifrados de IA e credenciais OAuth por empresa em `apps/api/prisma/schema.prisma` (`CompanyAiSettings`, `AppCredential`); configuração/teste de canal em `src/routes/_app.canais.tsx` e `apps/api/src/chatwoot/chatwoot-inbox-config.service.ts`; conexão Google em `src/routes/_app.apps.google-calendar.tsx`. | Isolamento de segredo e teste de Chatwoot existem. Faltam contratos de formulário reutilizáveis, teste homogêneo para todos os conectores e ambientes desenvolvimento/homologação/produção. Ambientes devem ficar para depois da entrega. |
| 6 | Base de conhecimento com fontes e escopo | **EXISTE PARCIALMENTE** | Itens, chunks, embeddings e status de processamento em `AssistantKnowledge`/`AssistantKnowledgeChunk`; CRUD em `src/routes/_app.conhecimento.tsx` e `apps/api/src/assistant-knowledge/`; recuperação em `apps/api/src/assistant-knowledge/assistant-knowledge-retrieval.service.ts`; fontes retornam na conversa. | RAG textual por assistente, indexação e fontes já existem. Faltam upload/documentos, URL/recrawl, biblioteca compartilhada, proprietário e escopo mais rico por fluxo. Para entrega, consolidar a fonte oficial manual e sua evidência. |
| 7 | Tabelas de dados de negócio pesquisáveis | **NÃO EXISTE** | Não há modelo de tabela de negócio nem importação CSV no schema/API; há apenas dados operacionais de agenda e conhecimento textual. | Não iniciar antes da entrega. Os dados oficiais críticos podem entrar como conhecimento curado ou integração já aprovada. |
| 8 | Variáveis e memória com escopos explícitos | **EXISTE PARCIALMENTE** | Memória de contato, categoria, origem, expiração, eventos e embeddings em `ContactMemoryProfile`, `ContactMemoryItem` e `ContactMemoryEvent`; serviço em `apps/api/src/contact-memories/contact-memories.service.ts`; painel em `src/routes/_app.memoria.tsx`; opções por agente em `src/routes/_app.agentes.novo.tsx`. | O isolamento por empresa e a possibilidade de escopo por assistente existem. Faltam um painel explícito de sessão/contato/empresa, finalidade/classificação por campo e inspeção de leitura/escrita no teste. Antes da entrega, fixar a política de escopo e retenção por agente. |
| 9 | Simulador com execução explicável | **EXISTE PARCIALMENTE** | Conversas manuais, anexos e novo histórico em `src/routes/_app.testes.tsx`; preview/run em `src/services/backendAssistantsService.ts`; logs de preview/conversa em `AssistantPreviewLog` e `AssistantConversation*`. | O teste manual funcional existe. Falta a trilha por turno (fluxo, fonte, ferramenta, memória, latência, custo e erro); não é necessário transformar isso em depurador visual completo antes da entrega. |
| 10 | Cenários de teste e critérios de aceite | **ADIAR** | Há testes unitários pontuais em `src/lib/*.test.ts` e scripts de smoke em `scripts/`, mas não há entidade/API/tela de cenários conversacionais. | Não criar suíte visual agora. Antes da entrega, usar um roteiro manual curto e repetível de aceite para o cliente; automatização declarativa fica para depois. |
| 11 | Versões, promoção e rollback seguros | **NÃO EXISTE** | Assistente e fluxos são atualizados in-place em `apps/api/src/assistants/assistants.service.ts` e `apps/api/src/assistant-flows/assistant-flows.service.ts`; `status` ativo/inativo não é versionamento. | É a maior lacuna de publicação. Antes da entrega, implementar o recorte mínimo: validação pré-publicação, snapshot imutável da configuração publicada e restauração dessa versão. Promoção entre ambientes pode esperar. |
| 12 | Logs, monitoramento e consumo por empresa | **EXISTE PARCIALMENTE** | Logs de runtime em `AssistantRuntimeLog`, APIs em `apps/api/src/logs/` e tela `src/routes/_app.logs.tsx`; consumo oficial OpenAI em `apps/api/src/usage/usage.service.ts` e tela `src/routes/_app.consumo.tsx`. | Já há isolamento por empresa, duração, modelo, fallback, fluxo e ferramentas usadas, além de custo/tokens OpenAI. Faltam alertas, visão por canal/versão e métricas de conhecimento/falha recorrente. |
| 13 | Multiempresa, papéis e acesso por agente | **EXISTE PARCIALMENTE** | Fronteira `companyId` é disseminada no schema e nos serviços; tenant/RBAC em `apps/api/src/auth/`; `CompanyMembership`, `Role`, `Permission` e `UserRole` no schema; usuários no painel em `src/routes/_app.configuracoes.tsx` e serviços `apps/api/src/studio-users/`. | Multiempresa e RBAC base existem. Faltam os papéis de produto propostos e ACL específica por agente/canal. Não granularizar além do necessário antes da entrega. |
| 14 | Transferência humana como estado operacional | **EXISTE PARCIALMENTE** | Fluxo declara handoff, time e labels em `AssistantFlow`; conversa registra `aiActive`, pausa e motivo em `AssistantConversation`; Chatwoot em `apps/api/src/chatwoot/`; contratos/executor controlado em `apps/api/src/runtime-v2/handoff-state.ts`, `chatwoot-handoff-executor.ts` e `operational-chatwoot-handoff-adapter.ts`. | Existe pausa/retomada e base de handoff, mas ainda falta fechar a experiência operacional: ticket/estado visível, fila/atribuição, SLA/timeout e confirmação de que a transferência foi concluída. Antes da entrega, limitar ao fluxo mínimo seguro com contexto e pausa da IA. |
| 15 | Editor de código livre para cliente | **ADIAR** | Não há editor de código livre no painel; ferramentas são configuradas por tela em `src/components/assistant/AssistantToolsTab.tsx` e `src/routes/_app.apps.custom-webhook.tsx`. | Decisão correta: manter fora do produto cliente. Casos especiais devem ser conector aprovado ou configuração guiada; qualquer área técnica futura precisa ser isolada e auditável. |

## Sequência recomendada

### 1. Antes da entrega ao cliente

Somente o necessário para uma IA estável, testável e operável:

1. **Runtime estável:** congelar o recorte de runtime habilitado, expor health/erro acionável e manter fallback seguro. Referências: `apps/api/src/assistant-conversations/`, `apps/api/src/ai-settings/`, `apps/api/src/diagnostics/`.
2. **Painel do agente e prontidão:** acrescentar checklist único de configuração obrigatória (modelo, instruções, canal, conhecimento, memória e handoff), sem novo canvas. Base: `src/routes/_app.agentes.novo.tsx`.
3. **Conhecimento oficial:** usar fontes curadas por assistente, exigir processamento concluído e tornar a fonte consultada visível ao operador. Base: `src/routes/_app.conhecimento.tsx` e `apps/api/src/assistant-knowledge/`.
4. **Memória isolada:** definir por agente se a memória é compartilhada ou isolada; registrar retenção e evitar dados sensíveis. Base: `apps/api/src/contact-memories/` e configurações do assistente.
5. **Simulador e aceite manual:** consolidar “novo usuário”, conversa de teste e um roteiro de casos críticos; mostrar pelo menos fonte, fluxo/fallback e erro do turno. Base: `src/routes/_app.testes.tsx` e `src/routes/_app.logs.tsx`.
6. **Publicação segura mínima:** validação de prontidão e snapshot/rollback da configuração publicada. Não criar ambientes complexos agora.
7. **Logs e consumo operacionais:** completar filtros e sinais de falha/fallback/custo por empresa e assistente, aproveitando o que já é gravado.
8. **Transferência humana mínima:** confirmar pausa da IA, destino configurado, resumo/transcript disponível ao atendente e caminho de retomada.

### 2. Logo após a entrega

- Cenários de teste declarativos para os 5–10 roteiros críticos, começando por regressão de conhecimento, handoff e ferramenta.
- Catálogo de conectores guiado, com teste padronizado e contrato de campos/segredos.
- Fonte por documento/URL, recrawl e biblioteca de conhecimento por empresa.
- Alertas de orçamento, falha recorrente, latência e degradação de respostas.
- Handoff com fila, atribuição, SLA, timeout e histórico operacional.
- Versões com diff legível e aprovação; promoção simples para homologação só quando houver necessidade real.

### 3. Evolução estrutural futura

- Canvas executável com subfluxos, nós, erro, timeout e comentários (itens 2 e 3).
- Tabelas pesquisáveis, CSV e separação rigorosa entre dados consultáveis e mutáveis.
- Ambientes completos, promoção, governança e rollback por conector.
- Permissões finas por agente/canal e auditoria expandida.
- Suíte visual de avaliações, templates, marketplace e catálogo universal de conectores.

## Indicadores de cobertura

- **JÁ EXISTE:** aproximadamente **0%** (nenhuma das 15 ideias está completa no nível descrito).
- **EXISTE PARCIALMENTE:** aproximadamente **60%** (9 de 15).
- **NÃO EXISTE:** aproximadamente **13%** (2 de 15).
- **ADIAR:** aproximadamente **27%** (4 de 15); são itens deliberadamente fora do recorte de entrega.

## Cinco maiores ganhos com menor risco

1. Checklist de prontidão no painel do agente, usando os campos e diagnósticos existentes.
2. Política explícita de memória por assistente (isolada/compartilhada, retenção e categorias permitidas).
3. Roteiro de simulação manual com “novo usuário” e evidência de fonte/fluxo/fallback.
4. Filtros e alertas operacionais mínimos sobre os logs e consumo já existentes.
5. Handoff Chatwoot mínimo e verificável: pausa da IA, destino, contexto e retomada.

## Próximo bloco objetivo

Implementar um **release gate operacional**: checklist de prontidão + validação de conhecimento/canal/memória/handoff + simulação manual obrigatória + snapshot publicado para rollback. É o menor bloco que reduz risco de produção sem reconstruir o Studio.
