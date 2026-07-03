# Guia de Telas do Cubo AI Studio

Este documento explica o funcionamento geral do app, o papel de cada tela e como elas se conectam no fluxo operacional. O objetivo é servir como material de treinamento interno para qualquer pessoa que precise entender a operação do sistema sem depender do código.

## 1. Visão Geral do App

O Cubo AI Studio é a interface de trabalho do módulo de IA do Cubo.Chat. Ele centraliza a criação, configuração, teste, publicação e acompanhamento de assistentes de IA usados em atendimento multicanal.

### Objetivo do sistema

O sistema existe para permitir que uma empresa:

- crie e edite assistentes de IA;
- alimente esses assistentes com base de conhecimento;
- configure ferramentas e integrações que o assistente pode acionar;
- desenhe fluxos de atendimento;
- conecte canais como WhatsApp, Instagram, Webchat e outros;
- teste o comportamento do runtime;
- acompanhe custos, uso e logs de execução;
- ajuste a configuração de IA por empresa/tenant.

### Principais módulos

| Módulo | O que faz | Estado atual |
| --- | --- | --- |
| Dashboard | Mostra resumo operacional do módulo de IA | Visual / mockado |
| Assistentes IA | Lista, cria, edita e ativa/desativa assistentes reais | Conectado ao backend |
| Base de Conhecimento | Gerencia itens de conhecimento por assistente | Conectado ao backend |
| Testes | Executa conversa de teste, preview e runtime | Conectado ao backend |
| Logs | Mostra auditoria e detalhes de execuções | Conectado ao backend |
| Configurações | Define provider de IA por tenant e trata segredo | Conectado ao backend |
| Ferramentas | Cadastro de integrações e webhooks | Demonstração local |
| Flow Builder | Editor visual de fluxo operacional | Demonstração local |
| Canais | Associa assistentes a canais do Cubo.Chat | Demonstração local |
| Implantação | Wizard guiado de onboarding/publicação | Demonstração local |
| Consumo IA | Métricas de uso e custo | Demonstração local |
| Variáveis | Catálogo de variáveis disponíveis nos fluxos | Demonstração local |
| Memória | Consulta de memórias por contato | Demonstração local |

### Como o usuário navega

O app usa navegação lateral e superior:

- a **sidebar** é o menu principal entre áreas internas;
- a **topbar** traz ações rápidas como criar novo assistente, alternar tema, abrir “Minha conta” e sair;
- dentro das telas, há links de atalho para telas relacionadas, principalmente entre Assistentes, Conhecimento, Testes e Logs.

### Autenticação e acesso

- A entrada pública é a tela de `Auth`.
- O shell autenticado (`/_app`) bloqueia o acesso às telas internas quando não há sessão ativa.
- Existe um campo de `role` no mock de autenticação (`admin`, `operator`, `viewer`), mas o frontend atual **não faz controle de rota por perfil**.
- Na prática, o que o frontend garante hoje é: autenticado acessa, não autenticado é redirecionado para `/auth`.

## 2. Mapa Rápido das Telas

| Tela | Rota | Natureza | Principal dependência |
| --- | --- | --- | --- |
| Auth | `/auth` | Pública | `useAuth()` |
| Dashboard | `/` | Interna | `src/data/mock` |
| Assistentes IA | `/agentes` | Interna real | `backendAssistantsService`, `currentCompanyService` |
| Criar/Editar Agente | `/agentes/novo` | Interna real | `backendAssistantsService`, `currentCompanyService` |
| Base de Conhecimento | `/conhecimento` | Interna real | `backendAssistantsService`, `currentCompanyService` |
| Testes | `/testes` | Interna real | `backendAssistantsService`, `backendConversationsService` |
| Logs | `/logs` | Interna real | `logsService` |
| Configurações | `/configuracoes` | Interna real | `aiSettingsService`, `currentCompanyService` |
| Ferramentas | `/ferramentas` | Interna demo | `src/data/mock` |
| Flow Builder | `/flow` | Interna demo | estado local + `@xyflow/react` |
| Canais | `/canais` | Interna demo | `src/data/mock` |
| Implantação | `/implantacao` | Interna demo | estado local |
| Consumo IA | `/consumo` | Interna demo | estado local |
| Variáveis | `/variaveis` | Interna demo | `src/data/mock` |
| Memória | `/memoria` | Interna demo | `src/data/mock` |

## 3. Documentação de Cada Tela

### 3.1 Auth

- **Nome da tela:** Entrar / Criar conta
- **Rota:** `/auth`
- **Objetivo:** permitir login ou cadastro inicial.
- **Principais ações:** entrar, criar conta, alternar entre abas de login e cadastro.
- **Dados exibidos:** formulários de e-mail, senha, nome e empresa.
- **Dados criados/alterados/consultados:** cria e lê a sessão no `useAuth`; no cadastro mockado, grava usuário em `localStorage`.
- **Permissões/perfil:** aberta para todos; sem papel/permissão formal no frontend.
- **Relação com outras telas:** após autenticar, redireciona para `/`; ao sair, o usuário volta para `/auth`.

**Observações importantes**

- O login é mockado no frontend.
- O cadastro também é mockado.
- O objetivo desta camada é preparar a experiência, não substituir o backend real de identidade.

### 3.2 Dashboard

- **Nome da tela:** Dashboard
- **Rota:** `/`
- **Objetivo:** dar uma visão geral do módulo de IA.
- **Principais ações:** navegar para o log mais recente.
- **Dados exibidos:** KPIs, gráfico de atendimentos por dia, intenções mais frequentes e últimas conversas.
- **Dados criados/alterados/consultados:** apenas consulta dados locais de exemplo em `src/data/mock`.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** cada linha da tabela leva para `/logs`.

**Como interpretar**

- A tela funciona como painel executivo.
- Ela não altera nada no sistema.
- É a primeira área que o usuário enxerga após entrar.

### 3.3 Assistentes IA

- **Nome da tela:** Assistentes IA
- **Rota:** `/agentes`
- **Objetivo:** listar e administrar os assistentes reais do tenant atual.
- **Principais ações:** buscar por nome, filtrar por status, atualizar lista, ativar/inativar, editar e testar.
- **Dados exibidos:** nome, descrição, status, empresa, atualização, indicação de prompt configurado.
- **Dados criados/alterados/consultados:** consulta lista e tenant atual; altera status do assistente; abre edição em `/agentes/novo`; envia o assistente para teste em `/testes`.
- **Permissões/perfil:** exige sessão autenticada; não há bloqueio por papel no frontend.
- **Relação com outras telas:** é a tela central do fluxo, conectando-se a `/agentes/novo`, `/testes`, `/conhecimento` e `/configuracoes`.

**Serviços usados**

- `currentCompanyService.get()` para resolver a empresa atual.
- `backendAssistantsService.list()` para listar os assistentes.
- `backendAssistantsService.updateStatus()` para alternar status.

**Regras relevantes**

- O filtro de status na UI traduz `ACTIVE` para “ativo” e `INACTIVE` para “pausado”.
- O botão de testar leva o `assistantId` para `/testes`.
- A tela não cria segredos nem expõe tokens.

### 3.4 Criar / Editar Agente

- **Nome da tela:** Criar / Editar Agente
- **Rota:** `/agentes/novo`
- **Parâmetro opcional:** `assistantId`
- **Objetivo:** criar um novo assistente ou editar um existente.
- **Principais ações:** carregar assistente, alterar nome/descrição/prompt/modelo/temperatura, salvar, ativar/inativar, fazer preview, abrir teste runtime e mudar o assistente selecionado.
- **Dados exibidos:** informações do assistente, status, prompt, mensagem inicial, conhecimento vinculado, resumo para publicação e preview determinístico.
- **Dados criados/alterados/consultados:** cria assistentes, atualiza assistentes, altera status, consulta conhecimento do assistente, executa preview.
- **Permissões/perfil:** exige sessão autenticada; sem controle por perfil no frontend.
- **Relação com outras telas:** é o principal editor de Assistentes; aponta para `/conhecimento` para alimentar conhecimento e para `/testes` para validar o runtime.

**Serviços usados**

- `currentCompanyService.get()`
- `backendAssistantsService.list()`
- `backendAssistantsService.get(id)`
- `backendAssistantsService.create()`
- `backendAssistantsService.update()`
- `backendAssistantsService.updateStatus()`
- `backendAssistantsService.preview()`
- `backendAssistantsService.knowledgeList()`

**Fluxo da tela**

1. Carrega empresa e lista de assistentes.
2. Seleciona um assistente a partir do `assistantId` da rota ou do primeiro disponível.
3. Busca os detalhes do assistente selecionado.
4. Busca o conhecimento associado.
5. Permite edição e criação.
6. O preview mostra uma resposta determinística antes do runtime real.

**Regras relevantes**

- Nome é obrigatório para salvar.
- `description`, `initialMessage`, `instructions`, `model` e `temperature` são opcionais.
- Se o assistente for editado e o status no formulário diferir do status salvo, a tela também chama `updateStatus`.
- A aba de conhecimento mostra itens carregados e oferece atalho para `/conhecimento`.
- A aba de ferramentas e memória ainda é declarativa, com indicação de que o recurso não está conectado nessa etapa.
- A aba de segurança reforça que o frontend não chama provedores externos nem expõe segredos.

### 3.5 Base de Conhecimento

- **Nome da tela:** Base de Conhecimento
- **Rota:** `/conhecimento`
- **Objetivo:** criar, editar, filtrar e excluir itens de conhecimento manual por assistente.
- **Principais ações:** selecionar assistente, pesquisar itens, editar item, excluir item, salvar novo item ou alterações.
- **Dados exibidos:** lista de itens com título, conteúdo, status e data de atualização; assistente selecionado; status do assistente.
- **Dados criados/alterados/consultados:** consulta assistentes; consulta, cria, altera e remove itens de conhecimento.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** alimenta o assistente em `/agentes/novo` e, por consequência, o runtime em `/testes`.

**Serviços usados**

- `currentCompanyService.get()`
- `backendAssistantsService.list()`
- `backendAssistantsService.knowledgeList()`
- `backendAssistantsService.knowledgeCreate()`
- `backendAssistantsService.knowledgeUpdate()`
- `backendAssistantsService.knowledgeDelete()`

**Regras relevantes**

- É preciso selecionar um assistente antes de manipular o conhecimento.
- Título e conteúdo são obrigatórios.
- Ao trocar de assistente, a lista e o formulário são limpos.
- A busca filtra por título e conteúdo.

### 3.6 Testes

- **Nome da tela:** Testar Agente
- **Rota:** `/testes`
- **Parâmetro opcional:** `assistantId`
- **Objetivo:** simular o atendimento real do assistente com conversas, preview e debug do runtime.
- **Principais ações:** escolher assistente, criar nova conversa, recarregar mensagens, limpar tela, enviar mensagem, adicionar anexo simulado, visualizar fontes e acompanhar o painel de debug.
- **Dados exibidos:** lista de assistentes ativos, lista de conversas do assistente, mensagens, resposta do preview, resposta do runtime, fontes e diagnóstico de execução.
- **Dados criados/alterados/consultados:** cria conversas, lê conversas, lê mensagens, envia mensagens, consulta preview e runtime, atualiza a UI de debug.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** recebe assistentes criados em `/agentes/novo`; usa conhecimento manual cadastrado em `/conhecimento`; gera execuções que aparecem em `/logs`.

**Serviços usados**

- `backendAssistantsService.list()`
- `backendConversationsService.list()`
- `backendConversationsService.create()`
- `backendConversationsService.messages()`
- `backendConversationsService.send()`

**Regras relevantes**

- O seletor de assistente mostra apenas assistentes `ACTIVE` e esconde assistentes de smoke test.
- Se uma conversa não pertencer ao assistente selecionado, a tela trata como “Conversation not found” e pede nova seleção.
- `Enter` envia a mensagem e `Shift+Enter` quebra linha.
- O envio cria conversa automaticamente se ainda não houver uma conversa selecionada.
- O painel de debug mostra:
  - modo de runtime;
  - modelo e temperatura;
  - origem da configuração;
  - classificação da execução;
  - histórico consumido;
  - flags sobre mensagem inicial e instruções;
  - fontes usadas;
  - resposta do preview;
  - resposta do runtime;
  - resumo da execução.

### 3.7 Logs

- **Nome da tela:** Logs de IA
- **Rota:** `/logs`
- **Objetivo:** auditar execuções do runtime de IA com dados sanitizados.
- **Principais ações:** filtrar por modo, status e fallback; atualizar lista; abrir detalhe de uma execução.
- **Dados exibidos:** data, assistente, modo, status, provider, modelo, duração, fallback e saída.
- **Dados criados/alterados/consultados:** consulta logs listados e log detalhado.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** recebe eventos gerados por testes/runtime de assistentes; ajuda a investigar problemas vindos de `/testes` ou da operação real.

**Serviços usados**

- `logsService.list()`
- `logsService.get()`

**Regras relevantes**

- Os logs são apresentados sem prompt completo ou segredos.
- A tela trata `ApiError` separadamente para mostrar mensagens do backend.
- Os filtros são combinados na query da listagem.

### 3.8 Configurações

- **Nome da tela:** Configurações
- **Rota:** `/configuracoes`
- **Objetivo:** definir o provider de IA por tenant de forma segura.
- **Principais ações:** ativar runtime de IA, escolher provider, configurar base URL, escolher modelo, informar API key, salvar, testar conexão e remover chave.
- **Dados exibidos:** configuração ativa, opções de provider/modelo/timeout, estado da chave, origem da configuração, último teste e resumo do tenant.
- **Dados criados/alterados/consultados:** consulta configuração atual, opções disponíveis e empresa; altera configuração; grava ou remove API key; testa conexão.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** influencia diretamente o comportamento observado em `/testes` e nos logs.

**Serviços usados**

- `currentCompanyService.get()`
- `aiSettingsService.get()`
- `aiSettingsService.getOptions()`
- `aiSettingsService.save()`
- `aiSettingsService.test()`
- `aiSettingsService.deleteApiKey()`

**Regras relevantes**

- A API key nunca é exibida em claro no frontend.
- Se nenhum valor estiver salvo no tenant, o backend pode usar fallback global.
- O teste de conexão só fica habilitado quando há configuração salva e estável.
- Alterações não salvas bloqueiam o teste.
- A remoção de chave exige confirmação do usuário.

### 3.9 Ferramentas

- **Nome da tela:** Ferramentas / Webhooks
- **Rota:** `/ferramentas`
- **Objetivo:** demonstrar o cadastro e o teste de integrações que um assistente poderia acionar.
- **Principais ações:** criar ferramenta, editar, duplicar, remover, testar e alternar confirmação antes de executar.
- **Dados exibidos:** lista de ferramentas, cliente, tipo, método, URL, status e último teste.
- **Dados criados/alterados/consultados:** manipula apenas estado local na UI.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** em fluxo ideal, as ferramentas seriam escolhidas em `/agentes/novo` e no `/flow`.

**Estado atual**

- Esta tela é demonstrativa e não está conectada ao backend.
- O texto da própria UI deixa isso explícito para o usuário.

**Regras relevantes**

- A tela usa `MaskedSecretInput`, mas o segredo continua apenas no estado local.
- A configuração de ferramenta exige nome, URL, tipo e método, mas a persistência ainda não está conectada.
- O botão de histórico apenas informa que o recurso ainda não está integrado.

### 3.10 Flow Builder

- **Nome da tela:** Flow Builder
- **Rota:** `/flow`
- **Objetivo:** desenhar o fluxo operacional da conversa.
- **Principais ações:** inserir blocos, arrastar e soltar no canvas, conectar nós, editar propriedades, excluir bloco, testar, salvar e publicar em modo demonstrativo.
- **Dados exibidos:** blocos de fluxo, canvas com nós e arestas, painel de propriedades, mensagens de feedback.
- **Dados criados/alterados/consultados:** altera estado local do fluxo; não persiste no backend nesta fase.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** conecta logicamente Assistentes, Conhecimento, Ferramentas, Memória, Canais e transferência humana.

**Estado atual**

- É um editor visual funcional no frontend, mas ainda sem persistência real.
- Os botões de salvar/publicar/testar exibem feedback de demonstração.

**Regras relevantes**

- Os blocos são agrupados por categoria: Fluxo, IA, Integrações, Lógica, Dados e Cubo.Chat.
- O assistente, a decisão e a condição têm saídas específicas.
- Remover um bloco também remove as arestas conectadas a ele.
- O painel de propriedades muda conforme o tipo do bloco.

### 3.11 Canais

- **Nome da tela:** Canais
- **Rota:** `/canais`
- **Objetivo:** demonstrar a associação de assistentes aos canais conectados via Cubo.Chat.
- **Principais ações:** visualizar cards de canais, abrir configuração e pausar/ativar IA.
- **Dados exibidos:** tipo de canal, inbox, cliente, assistente associado e status.
- **Dados criados/alterados/consultados:** usa dados mockados; não persiste alterações.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** depende conceitualmente dos assistentes, do flow e das credenciais de canal.

**Estado atual**

- A tela deixa explícito que credenciais ficam no backend do Cubo.Chat.
- O frontend apenas exibe status e um formulário ilustrativo.

**Regras relevantes**

- Canal ativo mostra ação “Pausar IA”.
- Canal inativo mostra ação “Ativar IA”.
- A configuração sugere empresa, inbox, agente padrão, fluxo, fallback humano e mensagens fora do horário.

### 3.12 Assistente de Implantação

- **Nome da tela:** Assistente de Implantação
- **Rota:** `/implantacao`
- **Objetivo:** guiar a implantação de um novo assistente do início ao fim.
- **Principais ações:** avançar/retroceder etapas, preencher dados simulados, simular envio de documentos, selecionar ferramentas, escolher modelo de fluxo, testar e publicar.
- **Dados exibidos:** wizard em sete passos e resumos de etapa.
- **Dados criados/alterados/consultados:** apenas estado local.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** funciona como roteiro operacional que conecta Assistentes, Conhecimento, Ferramentas, Flow, Testes e Publicação.

**As 7 etapas**

1. Dados da empresa
2. Criar Assistente
3. Enviar documentos
4. Configurar Ferramentas
5. Configurar Fluxo
6. Testar
7. Publicar

### 3.13 Consumo IA

- **Nome da tela:** Consumo IA
- **Rota:** `/consumo`
- **Objetivo:** apresentar métricas de custo, volume e desempenho da IA.
- **Principais ações:** visualização de KPIs e gráficos.
- **Dados exibidos:** tokens, requests, custo estimado, latência média, conversas resolvidas, transferências, economia gerada e distribuição por assistente/canal/modelo.
- **Dados criados/alterados/consultados:** apenas visualização local.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** complementa Dashboard e Logs para análise operacional.

### 3.14 Variáveis

- **Nome da tela:** Variáveis
- **Rota:** `/variaveis`
- **Objetivo:** listar variáveis disponíveis para prompts, fluxos e ferramentas.
- **Principais ações:** visualizar tabela e iniciar criação de variável.
- **Dados exibidos:** nome da variável, descrição, origem, exemplo e onde está disponível.
- **Dados criados/alterados/consultados:** usa dados mockados; o botão “Nova variável” ainda não persiste nada.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** as variáveis aparecem conceitualmente em `Flow Builder`, `Assistentes` e `Ferramentas`.

### 3.15 Memória

- **Nome da tela:** Memória
- **Rota:** `/memoria`
- **Objetivo:** consultar memórias salvas por contato e orientar o uso seguro desses dados.
- **Principais ações:** filtrar por cliente, contato, canal e tipo; editar; excluir.
- **Dados exibidos:** contato, telefone, cliente, tipo, informação, data de criação e expiração.
- **Dados criados/alterados/consultados:** usa dados mockados.
- **Permissões/perfil:** exige sessão autenticada.
- **Relação com outras telas:** a memória é uma peça de contexto do assistente e do flow, embora a UI atual ainda seja demonstrativa.

**Regra importante**

- A tela alerta explicitamente que não se deve armazenar dados sensíveis sem autorização.

## 4. Fluxo Entre as Telas

### Fluxo principal do sistema

#### 1. Entrar no sistema

O usuário acessa `/auth`, faz login e é redirecionado para `/`.

#### 2. Entender o panorama

No Dashboard, o usuário vê indicadores gerais, conversas recentes e pode saltar para os logs.

#### 3. Criar ou ajustar assistentes

Em `/agentes`, o usuário escolhe um assistente existente ou cria um novo em `/agentes/novo`.

#### 4. Alimentar o assistente

Na Base de Conhecimento, o conteúdo manual é vinculado ao assistente.

#### 5. Testar comportamento

Em `/testes`, o usuário seleciona o assistente, cria conversa de teste e envia mensagens para validar resposta, fontes, fallback e runtime.

#### 6. Ajustar configuração de IA

Em `/configuracoes`, o tenant define provider, modelo, timeout e API key.

#### 7. Observar auditoria

As execuções aparecem em `/logs`, permitindo rastrear modo, status, fallback, provider e duração.

### Como uma ação impacta outra tela

| Ação | Impacto |
| --- | --- |
| Criar/editar assistente em `/agentes/novo` | O assistente passa a aparecer em `/agentes` e pode ser usado em `/testes` |
| Atualizar conhecimento em `/conhecimento` | O assistente passa a responder melhor em `/testes` |
| Alterar runtime em `/configuracoes` | Muda o comportamento do teste e a forma como a resposta real é produzida |
| Enviar mensagem em `/testes` | Gera conversa, mensagens e possível log de runtime |
| Consultar `/logs` | Ajuda a investigar execuções que vieram do teste ou do uso real |
| Ajustar canal em `/canais` | Afeta a distribuição da conversa em Cubo.Chat, no fluxo operacional |
| Ajustar fluxo em `/flow` | Define a orquestração entre IA, ferramentas, memória e humano |

### Dependências importantes entre módulos

- **Assistentes** dependem de:
  - empresa atual;
  - conhecimento associado;
  - configuração de IA do tenant;
  - fluxo de atendimento.
- **Testes** dependem de:
  - assistente ativo;
  - conversas e mensagens;
  - configuração de IA;
  - conhecimento.
- **Logs** dependem de:
  - execuções feitas pelo runtime;
  - filtros de status/modo/fallback.
- **Ferramentas**, **Flow**, **Canais**, **Memória**, **Variáveis** e **Consumo** formam o conjunto operacional que apoia o runtime, mesmo quando algumas telas ainda estão em modo demonstrativo.

## 5. Regras de Negócio Importantes

### Regras de autenticação e acesso

- O frontend bloqueia o acesso às telas internas quando não há sessão.
- O perfil do usuário existe no mock, mas não há autorização por papel no frontend.
- A navegação acontece dentro do shell `/_app`, que só é renderizado quando autenticado.

### Regras de segurança

- Segredos nunca devem aparecer em claro no navegador.
- API keys, tokens e webhook secrets são tratados como responsabilidade do backend.
- A tela de Configurações reforça que a chave é criptografada no backend.
- A tela de Logs não mostra prompts completos nem segredos.
- A tela de Ferramentas usa input mascarado, mas ainda está em modo demonstrativo.
- A tela de Canais destaca que credenciais ficam no Cubo.Chat/backend.

### Regras de Assistentes

- O assistente pode ser criado, editado, ativado e desativado.
- `instructions`, `initialMessage`, `model` e `temperature` são campos centrais de configuração.
- Um assistente só entra no runtime de testes se estiver ativo.
- A tela de edição sincroniza status com `updateStatus` quando necessário.

### Regras de Conhecimento

- Conhecimento manual é sempre atrelado a um assistente.
- Título e conteúdo são obrigatórios.
- A troca de assistente limpa a edição atual.

### Regras de Runtime e Teste

- O assistente smoke test é ocultado da seleção padrão de testes.
- Se a conversa não for encontrada, a tela limpa o estado e pede nova seleção.
- O envio de mensagem cria uma conversa automaticamente se ainda não houver uma ativa.
- O preview é determinístico e serve para validar resposta antes do runtime completo.

### Regras de Configuração de IA

- O runtime real precisa estar habilitado para testar conexão de forma útil.
- O teste só é liberado quando a configuração está salva e estável.
- O frontend pode receber fallback global do backend quando o tenant não tem configuração própria.

### Regras de Flow

- O Flow Builder é visual e demonstrativo nesta fase.
- Alguns blocos têm saídas específicas, por exemplo:
  - `assistant` possui saídas como sucesso, baixa confiança, timeout e erro;
  - `decision` possui categorias de intenção;
  - `cond` possui verdadeiro/falso.
- Remover um nó remove suas conexões.

### Integrações e serviços envolvidos

- `apiClient` define a base da comunicação com o backend e injeta headers de desenvolvimento apenas fora de produção.
- `backendAssistantsService` cobre assistentes, preview, runtime e conhecimento.
- `backendConversationsService` cobre conversas e mensagens.
- `aiSettingsService` cobre a configuração de IA do tenant.
- `logsService` cobre listagem e detalhe de auditoria.
- `currentCompanyService` identifica o tenant atual.

## 6. Resumo Operacional

Se pensarmos no sistema como um fluxo único:

1. o usuário entra;
2. seleciona ou cria um assistente;
3. adiciona conhecimento;
4. ajusta prompt, modelo e temperatura;
5. define o provider de IA do tenant;
6. testa em conversa realista;
7. observa os logs;
8. publica e conecta canais;
9. acompanha custos e evolução.

## 7. Observação Final

Este app mistura telas já integradas ao backend com telas ainda demonstrativas. Isso é intencional e ajuda a equipe a trabalhar com um produto utilizável enquanto algumas integrações continuam em evolução.

As telas mais importantes para operação real hoje são:

- `/agentes`
- `/agentes/novo`
- `/conhecimento`
- `/testes`
- `/logs`
- `/configuracoes`

As telas mais voltadas à simulação ou planejamento operacional hoje são:

- `/ferramentas`
- `/flow`
- `/canais`
- `/implantacao`
- `/consumo`
- `/variaveis`
- `/memoria`

