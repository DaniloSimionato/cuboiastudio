# Análise Botpress para o Cubo AI Studio

## Decisão executiva

O Cubo deve ser um produto **declarativo e visual**: o cliente configura um agente, suas fontes, ferramentas, regras, canais e publicação por telas e formulários; a plataforma transforma isso em uma definição validada e executável. O melhor recorte do Botpress não é o editor antigo, mas a combinação atual de Studio, contratos tipados do core e primitivas do ADK.

Ordem de entrega recomendada:

1. configuração do agente, base de conhecimento, variáveis, simulador, canais e publicação;
2. catálogo de ferramentas, workflows visuais, transferência humana e observabilidade;
3. cenários automatizados, permissões granulares, templates e governança avançada.

Não tratar o Cubo como um IDE. Cliente não deve precisar escrever JavaScript, criar schemas ou entender chamadas de API para operar o painel.

## Ideias priorizadas

| Ideia | Como funciona no Botpress | Problema que resolve no Cubo | Recomendação | Prioridade | Complexidade |
|---|---|---|---|---|---|
| 1. Página inicial de configuração do agente | O Studio reúne instruções globais, bases de conhecimento, ferramentas, canais e análise de conversas em uma página inicial; esses atalhos refletem a configuração do nó autônomo principal. | Evita que o cliente precise procurar configurações em telas técnicas ou montar um fluxo para criar a primeira IA. | **Adotar.** Criar um assistente inicial com: objetivo, tom, idioma, modelo, instruções, limites, fontes, ferramentas e canais. Exibir uma pontuação de prontidão para publicar. | Alta | Média |
| 2. Canvas de workflows reutilizáveis | Workflows agrupam nós reutilizáveis; há entrada, saída, tratamento de erro, timeout e transições entre fluxos. | Permite desenhar processos previsíveis — qualificação, orçamento, agendamento, pós-venda — sem transformar toda a operação em um prompt único. | **Adotar.** Canvas com subfluxos, entrada/saída, erro, timeout e comentários. Começar com poucos tipos de nó e templates prontos. | Alta | Alta |
| 3. Nós com cartões de ação, condição e IA | Nós padrão executam cartões em sequência; nós autônomos deixam o modelo decidir entre ferramentas. Cartões cobrem mensagens, captura, transição, IA, tabelas e integrações. | Dá controle onde a empresa precisa de previsibilidade e autonomia onde conversa aberta é desejada. | **Adaptar.** Oferecer dois modos explícitos: **Determinístico** (etapas obrigatórias) e **IA com limites** (instruções, ferramentas permitidas, fontes e saídas). Não expor a terminologia interna de “cards”. | Alta | Alta |
| 4. Catálogo de ferramentas configuráveis | Integrações expõem configurações, ações, eventos, canais e schemas; no ADK, ferramentas têm descrição, entradas e saídas validadas, e o modelo decide quando chamá-las. | Clientes precisam conectar CRM, agenda, ERP, e-mail e webhooks sem programar e sem dar à IA acesso irrestrito. | **Adotar.** Catálogo com conectores aprovados e uma ferramenta “HTTP/Webhook” guiada. Cada ferramenta deve declarar finalidade, campos de entrada, permissões, timeout, confirmação antes de ação sensível e fallback. | Alta | Alta |
| 5. Conexão por formulário, credenciais isoladas e ambientes | O core usa schemas que descrevem campos, títulos, ajuda e segredo; integrações podem oferecer configuração manual, OAuth e sandbox. Segredos ficam separados da definição do agente. | Reduz falhas de integração, exposição de chaves e dependência da equipe técnica para configurar um canal. | **Adotar.** Formularios gerados por contrato, cofre de segredos por empresa/ambiente e botão “testar conexão”. Separar desenvolvimento, homologação e produção desde o início. | Alta | Alta |
| 6. Base de conhecimento com fontes e escopo | Bases reúnem sites, documentos, texto, tabelas, busca web e fontes de integrações. Podem recrawlear sites e ser selecionadas por nó/ferramenta; logs mostram consulta, trechos e resultado. | Cliente precisa alimentar a IA com informação atual sem reenviar prompts ou depender de código. | **Adotar.** Biblioteca de fontes por empresa, com status de indexação, recrawl, proprietário, data de atualização, permissões e citações na resposta. Permitir vincular fontes por agente e por workflow, não apenas globalmente. | Alta | Alta |
| 7. Tabelas de dados de negócio pesquisáveis | O Studio mantém tabelas estruturadas e permite torná-las fontes de conhecimento; o ADK trata tabelas como primitiva de dados. | Catálogos, preços, estoque, regras comerciais e FAQs estruturadas não cabem bem só em PDFs. | **Adotar.** Oferecer tabelas simples, importação CSV e campos pesquisáveis. Separar claramente “dados para a IA consultar” de “dados operacionais que ela pode alterar”. | Alta | Média |
| 8. Variáveis e memória com escopos explícitos | O Studio separa variáveis de workflow, conversa, usuário, bot e configuração; o ADK usa schemas para estado de conversa, usuário e bot. Estado é persistido por escopo. | Sem escopo, dados de um cliente podem vazar para outro, o agente perde contexto ou guarda informação além do necessário. | **Adotar.** Painel de memória com três níveis iniciais: sessão, contato e empresa/agente. Exigir tipo, finalidade, retenção e classificação sensível; mostrar no simulador o que foi lido/escrito. Segredos nunca entram na memória visível. | Alta | Média |
| 9. Simulador com execução explicável | O Emulator reinicia conversa ou usuário, simula timeout e mostra eventos, transições, captura, busca de conhecimento e falhas em linha. O ADK acrescenta traces de modelo, ferramentas e etapas. | Cliente não consegue confiar nem corrigir uma IA se apenas vê a resposta final. | **Adotar.** Chat de teste ao lado do canvas, com trilha visual: nó executado, fonte consultada, ferramenta chamada, variável alterada, latência, custo e erro. Incluir modo “novo usuário” e dados de teste. | Alta | Alta |
| 10. Cenários de teste e critérios de aceite | O ADK define evals como roteiros de conversa com verificações de resposta, ferramenta chamada, estado, tabela, workflow e tempo; pode usar juiz LLM para critérios semânticos. | Evita publicar alterações que quebram fluxos críticos, usam ferramenta errada ou pioram respostas. | **Adaptar.** Interface de cenários “Dado/Quando/Então”, com conversas gravadas como rascunho e assertions visuais. Exigir passagem de uma suíte mínima antes de publicar; usar juiz por IA somente como complemento, nunca como única aprovação de operação crítica. | Alta | Média |
| 11. Versões, promoção e rollback seguros | O Studio cria versão manual ou ao publicar, permite comparar e restaurar, mas alerta que a restauração sobrescreve o estado atual. | Clientes precisam experimentar sem interromper produção e recuperar rapidamente uma versão estável. | **Adotar.** Rascunho imutável ao publicar, diff legível (prompt, fluxo, fontes, integrações e variáveis), promoção homologação → produção, aprovação e rollback de um clique. Guardar também a versão da configuração de cada conector. | Alta | Alta |
| 12. Logs, monitoramento e consumo por empresa | Botpress separa conversas, eventos, logs, issues e analytics; o ADK registra spans para modelo, ferramenta, busca, workflow e erro, incluindo tokens, latência e duração. Há cotas de IA, vetores, arquivos, tabelas e eventos por workspace. | Sem visibilidade de custo e falha, a operação descobre problemas pelo cliente e não consegue controlar margem. | **Adotar.** Painel por empresa, agente, canal e versão: conversas, resolução, transferência humana, falhas, latência, tokens/custo, uso de conhecimento e consumo de cada conector. Alertar orçamento, erro recorrente e degradação de teste. | Alta | Alta |
| 13. Multiempresa, papéis e acesso por agente | Workspaces agrupam vários agentes, consumo e membros; há papéis no workspace, auditoria e controle de acesso específico por agente. | Uma agência ou operação SaaS precisa isolar clientes, limitar acesso interno e cobrar por uso sem misturar dados. | **Adotar.** Empresa como fronteira obrigatória de dados, credenciais, fontes, custo e auditoria. Papéis iniciais: proprietário, administrador, editor, analista e operador de atendimento; ACL adicional por agente/canal. | Alta | Alta |
| 14. Transferência para humano como estado operacional | O HITL cria ticket/sessão, envia contexto e transcript, permite fila, atribuição, timeout, cancelamento e retomada do bot; a interface de integração desacopla o fluxo do provedor de atendimento. | “Falar com humano” não pode ser só uma mensagem: é necessário preservar contexto, definir responsabilidade e evitar conversas abandonadas. | **Adotar.** Nó “Transferir para atendimento” com motivo, prioridade, resumo, transcript, campos do contato, fila, SLA, timeout e ação de retorno. Construir um contrato único de handoff para poder conectar atendimento próprio, Zendesk, Intercom ou outro provedor depois. | Alta | Alta |
| 15. Editor de código livre no painel do cliente | O Studio ainda possui Execute Code; o próprio material alerta para revisão de código, segredos e tratamento de falhas. O ADK é assumidamente uma experiência code-first para desenvolvedores. | Parece uma saída rápida para casos especiais, mas devolve a dependência de código, aumenta risco de segurança e torna suporte/multiempresa difícil. | **Rejeitar** para o público cliente. Oferecer blocos configuráveis, transformações pré-aprovadas e solicitação de conector. Se houver uma área técnica futura, ela deve ser isolada, auditada e não necessária para operar o produto. | Média | Baixa |

## Arquitetura de produto recomendada

Use a seguinte separação de responsabilidades, inspirada nos contratos atuais do core/ADK, mas implementada de forma própria:

| Camada | Responsabilidade no Cubo |
|---|---|
| Definição declarativa | Agente, prompt, workflows, nós, variáveis, fontes, ferramentas, canais e políticas em dados versionáveis e validados. |
| Catálogo de capacidades | Cada integração descreve seus campos, segredos, ações, gatilhos, eventos e permissões. A interface gera os formulários a partir desse contrato. |
| Runtime | Executa o fluxo, controla estado por escopo, aplica limites de ferramenta, registra trilhas e propaga a versão publicada. |
| Dados e conhecimento | Separa documentos indexados, tabelas, memória e segredos; sempre aplica isolamento por empresa. |
| Controle operacional | Simulador, cenários de teste, logs, custos, publicação, rollback, auditoria e atendimento humano. |

Essa separação permite começar com uma experiência simples sem bloquear evolução: novos conectores e nós entram como capacidades declaradas, sem redesenhar o painel nem expor código ao cliente.

## Guardrails de produto que devem entrar no MVP

- Não publicar se houver credencial ausente, fonte ainda indexando, integração com falha ou cenário crítico reprovado.
- Toda ação externa deve ter timeout, tratamento de erro, trilha de auditoria e, quando houver efeito financeiro ou irreversível, confirmação explícita.
- Toda resposta baseada em conhecimento deve poder revelar a fonte ao operador; o cliente final pode receber citação conforme política do canal.
- Toda memória deve ter dono, escopo, período de retenção e opção de apagar/exportar por contato e por empresa.
- Custo e limites precisam ser mostrados antes da publicação e monitorados depois, por agente e por empresa.
- O rollback deve recuperar uma configuração publicada completa; não apenas o prompt ou o canvas.

## O que aproveitar e o que não transportar do Botpress

**Aproveitar como referência de produto:** configuração inicial conectada ao runtime; workflows com exceções; contratos de integração com campos descritos; fontes de conhecimento com diagnóstico; escopos de estado; emulador explicável; cenários de avaliação; telemetria detalhada; versão/publicação; abstração de handoff por provedor.

**Não transportar:** nomes, código, schemas, componentes visuais, arquivos de fluxo ou implementação de runtime do Botpress. A ideia de editor visual do v12 continua válida, mas seu modelo de fluxos/estado é histórico e menos adequado para agentes atuais; use-o apenas para reconhecer padrões de UX como canvas, inspeção de payload e separação de fluxo lógico da apresentação.

## Risco de licença

- `botpress/core` declara licença MIT, mas isso não autoriza copiar indiscriminadamente dependências, marcas, assets ou código de terceiros que possam estar em subdiretórios.
- `botpress/v12/LICENSE` declara **AGPLv3**. Não copiar, adaptar código, incorporar componentes, reutilizar arquivos de fluxo, nem derivar a implementação do editor v12 em um produto proprietário/SaaS sem análise jurídica específica. A obrigação de disponibilização de código em uso via rede é especialmente relevante para o Cubo.
- O repositório v12 também contém módulos com arquivos de licença próprios; qualquer inspeção futura exige verificação por arquivo/módulo.
- Esta análise recomenda somente padrões funcionais e de produto observados nos repositórios, não reutilização de código. Não constitui parecer jurídico.

## Referências consultadas nesta pasta

- `botpress/docs/studio`: configuração inicial, workflows, nós, emulador, variáveis, base de conhecimento, integrações, versões e cartões.
- `botpress/docs/get-started/manage-your-agent` e `configure-your-workspace.mdx`: monitoramento, inspeção, acesso, handoff, workspace, papéis e consumo.
- `botpress/docs/adk`: configuração, estado, ferramentas, workflows/steps, evals, debugging e HITL.
- `botpress/core`: definições de plugins/integrations e contratos tipados de schema, incluindo webhook, analytics, knowledge, HITL e Zendesk Messaging HITL.
- `botpress/v12/docs`: somente referências históricas do Studio, Flow Editor, Emulator e memória; `botpress/v12/LICENSE` para o alerta AGPLv3.
