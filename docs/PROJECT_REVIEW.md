# PROJECT REVIEW - Cubo AI Studio

Auditoria técnica do frontend, feita apenas por leitura do repositório.  
Escopo: arquitetura, stack, segurança, escalabilidade, organização, UX, design system, documentação e roadmap de backend.

## Conclusão Executiva

O projeto é um **bom scaffold de Lovable/TanStack Start para prototipação**, mas **ainda não está pronto para produção**. A base conceitual é boa: `routes/`, `services/`, `types/`, `lib/`, `docs/` e um design system baseado em Radix/shadcn + Tailwind 4. Porém, existem problemas estruturais graves:

- imports apontam para arquivos que não existem
- há arquivos vazios que deveriam exportar componentes centrais
- a camada de `services` ainda é mock pura, não um gateway para backend
- há divergência forte entre `docs` e a implementação real
- o sistema de auth mock grava senhas em `localStorage`
- `src/data/mock.ts` e `src/types/index.ts` representam o domínio com modelos diferentes e incompatíveis

O resultado é um frontend visualmente completo, mas arquiteturalmente ainda inconsistente.

## Achados Críticos

1. Imports quebrados para componentes inexistentes
   - Várias rotas importam `@/components/PageHeader` e `@/components/StatusBadge`, por exemplo em [src/routes/_app.index.tsx:2](./src/routes/_app.index.tsx#L2) e [src/routes/_app.configuracoes.tsx:2](./src/routes/_app.configuracoes.tsx#L2).
   - Há também imports de `@/components` em [src/routes/_app.configuracoes.tsx:13](./src/routes/_app.configuracoes.tsx#L13), [src/routes/_app.canais.tsx:13](./src/routes/_app.canais.tsx#L13) e [src/routes/_app.ferramentas.tsx:14](./src/routes/_app.ferramentas.tsx#L14), mas não existe `src/components/index.ts`.
   - Os arquivos existentes são `src/components/ui/PageHeader.tsx`, `src/components/ui/StatusBadge.tsx` e `src/components/ui/index.ts`, e estão vazios.

2. Auth mock inseguro
   - [src/lib/auth.tsx:29-36](./src/lib/auth.tsx#L29) e [src/lib/auth.tsx:51-79](./src/lib/auth.tsx#L51) armazenam usuários e senhas em `localStorage`.
   - Isso contradiz a documentação de segurança e não pode ser levado para produção.

3. Divergência de domínio
   - [src/data/mock.ts](./src/data/mock.ts) e [src/types/index.ts](./src/types/index.ts) descrevem os mesmos conceitos com modelos diferentes e, em alguns casos, incompatíveis.
   - Exemplo: `LogConversa` em `mock.ts` não bate com `ExecutionLog` em `types/index.ts`.

4. Docs prometem uma arquitetura mais madura do que existe hoje
   - [docs/FRONTEND_OVERVIEW.md](./docs/FRONTEND_OVERVIEW.md) descreve arquivos, rotas e mocks que não existem no repositório atual.

---

## 1. Estrutura

### Como o projeto está organizado

A organização real é esta:

- `src/routes/` contém o app TanStack Start file-based
- `src/components/` contém componentes de layout, segurança, feedback e uma grande coleção de primitives shadcn/Radix em `src/components/ui/`
- `src/lib/` contém providers e utilitários de aplicação
- `src/services/` contém stubs de serviços, mas ainda não faz chamadas reais ao backend
- `src/data/mock.ts` concentra todo o domínio mockado
- `src/types/index.ts` concentra tipos “oficiais” do frontend
- `docs/` tem documentação de intenção, não documentação fiel ao código atual

### A estrutura é boa?

Para um projeto criado pelo Lovable, **sim, como base inicial**. Para um SaaS grande, **ainda não**. Os pontos positivos:

- separação clara entre roteamento, componentes, dados e serviços
- uso de TanStack Start, TanStack Router e React Query
- design system com tokens em CSS variables
- preocupação explícita com segurança de segredos

Os problemas:

- não existe um barrel export funcional em `src/components`
- há componentes vazios que o app tenta importar
- `services` ainda são mocks isolados, sem contrato real com backend
- o domínio está duplicado entre mock e types
- muitas telas criam subcomponentes locais repetidos

### O que melhoraria?

- criar um `src/components/index.ts` e unificar exports públicos
- mover componentes de domínio para pastas coerentes, sem duplicar nomes entre `ui/` e raiz
- separar o domínio por feature em vez de manter um `mock.ts` monolítico
- centralizar tipos compartilhados em uma fonte única de verdade
- remover os arquivos vazios ou preenchê-los corretamente

### Há arquivos duplicados?

Sim, ou pelo menos sobrepostos:

- `src/components/layout/Sidebar.tsx` é uma sidebar de layout própria, enquanto `src/components/ui/sidebar.tsx` é um primitive shadcn grande e totalmente separado
- `src/data/mock.ts` e `src/types/index.ts` duplicam o domínio, mas com contratos diferentes
- `src/components/ui/PageHeader.tsx` e `src/components/ui/StatusBadge.tsx` existem, mas os imports reais apontam para `@/components/PageHeader` e `@/components/StatusBadge`

### Há componentes repetidos?

Sim, em padrão e responsabilidade:

- helpers de campo como `Field`, `ToggleRow`, `Summary`, `Row` e `Debug` são reimplementados em várias rotas
- estados vazios/loading/erro existem em `src/components/feedback/States.tsx`, mas não estão amplamente integrados

### Existe algo que deveria ser separado?

Sim:

- `src/routes/_app.flow.tsx` está grande demais e deveria ser dividido em subcomponentes
- `src/routes/_app.agentes.novo.tsx` mistura criação, edição, publicação e governança em um único arquivo
- `src/data/mock.ts` precisa ser quebrado por domínio

### Existe algo que deveria ser unificado?

Sim:

- domínio de tipos
- helpers de formulário
- componentes de header, badge e status
- estados de loading/empty/error
- padrões de formulário e card de seção

---

## 2. Stack

### Stack real do projeto

- **Framework:** TanStack Start
- **UI runtime:** React 19
- **Linguagem:** TypeScript
- **Build:** Vite
- **Roteamento:** TanStack Router file-based
- **Estado/caching assíncrono:** TanStack React Query
- **Estilo:** Tailwind CSS v4
- **Componentização UI:** Radix UI + shadcn/ui
- **Ícones:** lucide-react
- **Validação:** zod
- **Forms:** react-hook-form + `@hookform/resolvers`
- **Charts:** recharts
- **Flows visuais:** `@xyflow/react`
- **Toasts:** sonner
- **Utilitários:** class-variance-authority, clsx, tailwind-merge, date-fns, embla-carousel-react, input-otp, react-day-picker, react-resizable-panels, vaul

### Configuração de build e tooling

- `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` e só adiciona a entrada do server
- `eslint.config.js` usa ESLint 9, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` e Prettier
- `tsconfig.json` está em `strict: true`, mas afrouxa `noUnusedLocals` e `noUnusedParameters`
- `.prettierrc` está simples e coerente

### A stack faz sentido para um SaaS de IA grande?

**Sim, com ressalvas.**

Ela é moderna e adequada:

- TanStack Start + Router dão uma base forte para SSR, roteamento e data flow
- React Query é bom para cache, invalidação e estados assíncronos
- Tailwind 4 + Radix/shadcn formam uma base produtiva para UI enterprise

Ressalvas importantes:

- TanStack Start ainda exige disciplina forte de arquitetura e operação
- o projeto precisa de contratos de API estáveis e tipagem compartilhada com o backend
- a base atual é muito dependente de mocks e componentes grandes demais
- o `tsconfig` está estritamente configurado, mas com relaxamentos que reduzem proteção

---

## 3. Escalabilidade

### O frontend suporta esse crescimento hoje?

**Ainda não de forma confiável.**  
Para milhares de empresas, dezenas de milhares de assistentes, milhões de mensagens e centenas de tools, a interface atual só aguenta como protótipo funcional.

### Pontos positivos

- roteamento file-based tende a dividir o bundle por rota
- componentes estão relativamente organizados por área
- o layout global já separa shell, auth e navegação

### Limitações para escala

- toda a navegação e estado de tenant estão acoplados a estado local
- o cliente atual no `Topbar` é apenas `useState`, sem persistência real de tenant
- tabelas e listas estão todas mockadas, sem paginação server-side, virtualização ou filtros persistidos
- o `Flow Builder` é pesado e monolítico
- não há data loaders/query keys reais para cache eficiente
- não há estratégia de “list/detail” com URL estável para entidades grandes

### O que mudaria?

- introduzir contexto real de tenant e resolver isso via URL, sessão ou backend
- migrar listas para paginação server-side com filtros e ordenação no backend
- virtualizar tabelas grandes
- separar bundle por feature de maneira mais agressiva
- usar loaders e queries por rota com cache consistente
- tratar `flow`, `logs`, `conhecimento` e `testes` como áreas de alto custo e otimizar com componentes menores

---

## 4. Organização

### Componentes

Bom começo, mas com excesso de componentes locais por rota.  
Os componentes globais mais úteis são:

- `MaskedSecretInput`
- `ConnectionStatusBadge`
- `SecurityNotice`
- `ConfirmDialog`
- `LoadingState`, `EmptyState`, `ErrorState`

Melhorias:

- expor um barrel público em `src/components/index.ts`
- padronizar `PageHeader` e `StatusBadge`
- extrair `Field`, `ToggleRow`, `Summary`, `Row` e similares para helpers compartilhados

### Services

Os services existem, mas ainda são **stubs de mock**:

- `apiFetch` existe em [src/services/apiClient.ts](./src/services/apiClient.ts), porém não é usado pelos services
- `agentsService`, `aiProviderService`, `cuboChatService`, `knowledgeService`, `logsService` e `toolsService` retornam `mockDelay(...)`

Melhorias:

- usar `apiFetch` de verdade
- criar contratos de request/response por feature
- evitar castings como `as Agent[]` e `as unknown as ExecutionLog[]`

### Pages / Rotas

As páginas cobrem um bom escopo funcional:

- dashboard
- agentes
- criação/edição de agente
- conhecimento
- ferramentas
- flow
- canais
- consumo
- testes
- logs
- variáveis
- memória
- configurações
- auth

Mas elas estão mais para demonstração do produto do que para operação real.

### Layouts

O layout geral é razoável:

- `__root.tsx` monta providers e shell
- `/_app.tsx` protege a área autenticada e monta sidebar/topbar

Porém:

- o bloqueio de auth é client-side
- o `Topbar` não reflete tenant real
- a sidebar própria compete com a sidebar primitive gerada

### Providers / Contexts

Os providers existem e fazem sentido como base:

- `ThemeProvider`
- `AuthProvider`
- `SidebarProvider`

Mas:

- `AuthProvider` precisa ser substituído por sessão real
- `ThemeProvider` e `SidebarProvider` estão ok para estado de UI
- seria interessante um `TenantProvider` e, possivelmente, um `PermissionsProvider`

### Hooks

Há poucos hooks próprios:

- `use-mobile.tsx`
- `useTheme`
- `useAuth`
- `useSidebar`

Isso é bom para começo, mas ainda insuficiente para um SaaS grande.

### Utils / Constants / Types

`src/lib/utils.ts` está correto, mas o domínio em `src/types/index.ts` não conversa bem com `src/data/mock.ts`.  
Isso precisa virar uma única fonte de verdade.

---

## 5. Segurança

### Confirmação objetiva

- **Não encontrei nenhuma API Key real no frontend**
- **Não encontrei chamadas diretas para OpenAI, Anthropic, Gemini, Chatwoot, Meta, Evolution, WAHA, UAZAPI ou Twilio**
- **Não encontrei SDKs externos desses provedores importados no navegador**

### O que existe de fato

- os providers e integrações são citados apenas em selects, textos, docs e mocks
- `src/services/apiClient.ts` aponta para `/api/*`, não para terceiros
- o código não faz `fetch` direto para APIs externas

### Problemas encontrados

- `src/lib/auth.tsx` armazena usuários e senhas em `localStorage`
- a documentação afirma que nenhum segredo fica no frontend, mas o auth mock quebra esse princípio
- os mocks contêm URLs de exemplo com aparência de endpoints externos; isso não é segredo, mas pode ser confundido com integração real

### Onde está seguro e onde não está

Seguro para protótipo:

- não há chave real exposta
- não há integração externa direta no browser

Inseguro para produção:

- auth em `localStorage`
- ausência de sessão httpOnly real
- ausência de CSRF/RBAC reais
- ausência de backend de segredos

### Referências importantes

- [src/services/apiClient.ts](./src/services/apiClient.ts)
- [src/services/aiProviderService.ts](./src/services/aiProviderService.ts)
- [src/services/cuboChatService.ts](./src/services/cuboChatService.ts)
- [src/lib/auth.tsx](./src/lib/auth.tsx)
- [docs/SECURITY_FRONTEND.md](./docs/SECURITY_FRONTEND.md)

---

## 6. Performance

### Imports

Pontos bons:

- bastante uso de import por rota, o que ajuda o code splitting
- o `Flow Builder` e `@xyflow/react` ficam isolados em uma rota específica

Pontos fracos:

- muitos arquivos de UI estão prontos, mas não há uma estratégia clara de barrel/export para reduzir acoplamento
- `src/components/ui` é grande e inclui muitos primitives que não parecem usados

### Lazy loading / bundle

- o roteamento por arquivo ajuda na divisão
- ainda assim, várias rotas carregam muitas dependências e muito markup inline
- o `Flow Builder` é particularmente pesado

### Render / estado

- várias páginas recriam arrays estáticos e helpers dentro do render
- há muito estado local para dados que deveriam vir do servidor ou de hooks
- não há memoização onde faria diferença real ainda, mas em escala ela será necessária

### Melhorias

- pagination server-side
- virtualization para tabelas grandes
- split de componentes grandes
- lazy load para módulos pesados
- extrair constantes e mapas estáticos para fora do componente
- usar React Query com chaves consistentes assim que o backend existir

---

## 7. Design System

### O que existe hoje

- tokens de cor e raio em `src/styles.css`
- dark mode com classe `.dark`
- primitives shadcn bem alinhados com Radix
- botão, card, table, select, dialog e demais componentes base coerentes

### O sistema é consistente?

**Parcialmente.**

Consistência estrutural existe, mas a consistência visual ainda é limitada:

- muitas telas usam padrão muito semelhante de cards e tabelas
- a identidade visual é correta, porém genérica
- o sistema depende bastante de classes utilitárias inline
- há pouca diferenciação semântica entre áreas do produto

### Cores

- paleta clara com acento roxo/índigo
- bom contraste geral
- porém a linguagem visual fica um pouco “default SaaS”

### Spacing e responsividade

- spacing padrão de Tailwind, bem aplicado
- layouts responsivos básicos estão lá
- mas alguns painéis como `flow` e `implantacao` ficam densos demais em telas menores

### Tipografia

- tipografia padrão de sistema
- não há fonte expressiva ou identidade tipográfica própria

### Dark mode

- existe e funciona via token CSS + classe `.dark`
- a base está boa
- falta polimento visual mais claro entre light e dark

### Conclusão do Design System

Há **fundação de design system**, não um design system completo.

---

## 8. UX

### O fluxo geral faz sentido?

Sim, para um produto de operação de agentes:

- autenticado entra no dashboard
- navega por agentes, conhecimento, tools, canais e flow
- testa antes de publicar
- acompanha logs, consumo e memória

### Problemas de UX

- muitos botões não executam nada
- algumas telas são apenas “painéis de demonstração”
- `Topbar` seleciona cliente, mas isso não propaga para o resto do app
- não há feedback de persistência real, loading real ou erro real
- a criação/edição de agente está concentrada em uma tela muito grande
- `flow` e `implantacao` têm complexidade alta demais para primeira visita

### O que está faltando

- página de detalhe de agente por ID
- fluxo de edição com validação e save real
- empty states e loading states reais
- histórico / auditoria detalhada em algumas entidades
- melhor navegação por tenant
- confirmação para ações destrutivas em telas que hoje exibem apenas botões

### O que deveria ser dividido

- `/_app.agentes.novo.tsx`
- `/_app.flow.tsx`
- `/_app.implantacao.tsx`
- `/_app.configuracoes.tsx`

---

## 9. Documentação

### Arquivos lidos

- `AGENTS.md`
- `docs/FRONTEND_OVERVIEW.md`
- `docs/SECURITY_FRONTEND.md`
- `src/routes/README.md`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`
- `.gitignore`
- `bunfig.toml`
- `components.json`

### Coerência geral

`docs/SECURITY_FRONTEND.md` está **conceitualmente coerente**, mas precisa ser lido junto com o código porque o auth mock o contradiz.

`docs/FRONTEND_OVERVIEW.md` está **desatualizado em relação ao código atual**. Principais inconsistências:

- fala em `src/data/mock/`, mas existe `src/data/mock.ts`
- cita rotas como `_app.dashboard.tsx` e `_app.agentes.$agentId.tsx`, mas o código real usa `_app.index.tsx` e `_app.agentes.novo.tsx`
- descreve serviços que ainda não existem de fato como camada de backend real
- afirma que `src/components` já concentra componentes públicos, mas o repositório não tem barrel público funcional

`src/routes/README.md` está ok como nota de convenção, mas não resolve os problemas reais do projeto.

### Inconsistências mais relevantes

- docs afirmam arquitetura pronta para backend, mas services ainda são mockados
- docs afirmam ausência de segredos no frontend, mas auth usa `localStorage`
- docs descrevem pastas e arquivos que não existem
- docs tratam o domínio como mais maduro do que a implementação real

---

## 10. Débito Técnico

### Crítico

- imports quebrados para componentes inexistentes
- `src/components` sem barrel público
- arquivos vazios para componentes centrais
- auth mock com senha em `localStorage`
- domínio duplicado e inconsistente entre `mock.ts` e `types/index.ts`
- `services` ainda não usam o `apiClient` de verdade

### Importante

- docs desalinhadas com o código real
- grande quantidade de telas com componentes locais repetidos
- `Topbar` usa seleção de cliente apenas em estado local
- layout autenticado depende de redirecionamento client-side
- falta de testes automatizados
- falta de page/detail routes consistentes para entidades principais

### Baixo impacto

- vários primitives shadcn não usados ainda
- muitos arrays inline e helpers pequenos dentro das rotas
- ausência de barrel exports e organização mais refinada do design system

---

## 11. Roadmap do Backend

### Fase 1 - Fundamento

- autenticação real com sessão httpOnly
- multiempresa/tenant
- RBAC básico
- banco de dados e migrações
- contratos `/api/*` base
- cofre de segredos

### Fase 2 - Núcleo do produto

- CRUD de agentes
- CRUD de canais
- CRUD de conhecimento
- CRUD de tools
- integração Cubo.Chat
- publicação de agente em inbox

### Fase 3 - Motor de IA

- orquestração prompt -> RAG -> tools -> resposta
- streaming de resposta
- fallback humano
- tratamento de confiança e regras de segurança

### Fase 4 - Observabilidade

- logs de conversa e execução
- auditoria
- custo/token accounting
- métricas por empresa, agente, canal e modelo

### Fase 5 - Operação e escala

- filas para ingestão e execução assíncrona
- retries e timeouts para tools
- rate limiting
- cache e indexação
- retenção de logs e memória

### Fase 6 - Produto enterprise

- permissões avançadas
- aprovações
- versionamento de agentes
- feature flags por tenant
- billing / planos / limites

---

## 12. MVP

Considerando uso inicial **apenas integrado ao Cubo.Chat**, o MVP deve ser bem menor do que a visão completa.

### Módulos realmente necessários

- autenticação e tenant básico
- cadastro de empresa/conta
- cadastro de agente
- configuração de prompt do agente
- conexão com Cubo.Chat
- vinculação agente <-> inbox/canal
- base de conhecimento mínima
- cadastro de tools essenciais
- teste de chat
- logs básicos
- segredos no backend
- publicação/ativação do agente

### O que pode sair do MVP

- `Flow Builder`
- módulo de consumo/custos avançado
- memória longa complexa
- variáveis avançadas
- wizard de implantação completo
- matriz de permissões complexa
- dashboards analíticos sofisticados
- integrações multiplataforma além do Cubo.Chat

### Leitura pragmática

Para o primeiro cliente, o frontend precisa provar:

1. o agente responde bem
2. o conhecimento funciona
3. a integração com Cubo.Chat publica e atende
4. logs permitem suporte e auditoria
5. segredos nunca aparecem no browser

Todo o resto é pós-MVP.

---

## 13. Resultado Final

Arquivo gerado:

- [PROJECT_REVIEW.md](./PROJECT_REVIEW.md)

### Observação operacional

Não implementei nenhuma funcionalidade.
Não refatorei nenhum arquivo existente.
Não adicionei código de produto.

Também não consegui validar `bun run build` e `bun run lint` neste ambiente, porque o executável `bun` não está disponível aqui.
