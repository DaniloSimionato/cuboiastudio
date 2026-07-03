# PROJECT_RULES.md

Documento oficial de regras do projeto Cubo AI Studio.

Este arquivo é a fonte de verdade para qualquer pessoa ou IA que trabalhe neste repositório.
Se houver conflito entre uma interpretação pessoal e este documento, este documento prevalece.

## 1. Objetivo do Projeto

O Cubo AI Studio e o modulo de Inteligencia Artificial da plataforma Cubo.Chat.

O foco atual e exclusivamente integrar capacidades de IA ao Cubo.Chat de forma segura, escalavel e controlada.

Nao e objetivo deste projeto criar uma plataforma generica de IA neste momento.

Um produto independente pode existir no futuro, mas isso nao faz parte do MVP.

Toda decisao tecnica deve priorizar:

- o sucesso do Cubo.Chat
- a estabilidade operacional
- a seguranca dos dados
- a simplicidade de manutencao

### Exemplo de criterio correto

- "Esta feature melhora a operacao do Cubo.Chat?"
- "Essa decisao reduz risco de vazamento de dados?"
- "Isso ajuda o primeiro cliente a ir para producao?"

Se a resposta for nao, a mudanca provavelmente nao pertence ao MVP.

## 2. Filosofia do Projeto

Os principios centrais do projeto sao:

- Simplicidade primeiro
- Seguranca acima de conveniencia
- Escalabilidade desde o inicio
- Codigo limpo
- Arquitetura modular
- Backend responsavel pela logica
- Frontend apenas apresenta dados
- Toda integracao externa passa pelo backend
- Multiempresa obrigatoria
- Logs obrigatorios
- Tudo deve ser testavel

### Interpretacao pratica

- Simplicidade primeiro: escolher a solucao mais simples que resolva o problema real.
- Seguranca acima de conveniencia: nunca expor segredos para facilitar teste rapido.
- Escalabilidade desde o inicio: evitar decisoes que bloqueiem crescimento futuro.
- Arquitetura modular: separar responsabilidades por dominio.
- Backend responsavel pela logica: o navegador nao decide nem executa integracao externa.

## 3. Como Desenvolver

Toda implementacao deve seguir exatamente esta ordem:

1. Ler a documentacao relevante
2. Identificar a Issue
3. Implementar somente aquela Issue
4. Nao antecipar proximas fases
5. Executar build
6. Executar typecheck
7. Executar lint
8. Atualizar documentacao
9. Gerar resumo tecnico

Nunca implementar duas issues simultaneamente.

### Regra operacional

Antes de comecar qualquer mudanca:

- localizar a issue atual
- ler os documentos relacionados
- entender os impactos
- confirmar o escopo

### Exemplo de comportamento correto

- Issue atual: "Criar healthcheck"
- Acao correta: implementar apenas healthcheck
- Acao incorreta: aproveitar para criar auth, logs e banco ao mesmo tempo

## 4. Regras Obrigatorias

Nao utilizar:

- `any`
- codigo morto
- componentes duplicados
- logica duplicada
- dependencias circulares

Sempre:

- reutilizar componentes
- reutilizar services
- reutilizar hooks
- reutilizar tipos

### Observacao

Se um tipo, service ou componente ja existe, ele deve ser reaproveitado ou evoluido com cuidado.
Duplicacao so e aceitavel se houver justificativa tecnica clara e documentada.

## 5. Frontend

O frontend nunca deve:

- armazenar API Keys
- armazenar Tokens
- armazenar Secrets
- chamar OpenAI diretamente
- chamar Anthropic diretamente
- chamar Gemini diretamente
- chamar Cubo.Chat diretamente com token administrativo
- acessar banco diretamente

O frontend deve:

- consumir apenas APIs internas
- manter tipagem forte
- manter componentes reutilizaveis
- manter loading
- manter tratamento de erro
- manter acessibilidade

### Regras de frontend

- O frontend e uma camada de apresentacao e interacao.
- O frontend nao e fonte de verdade de negocio.
- O frontend nao controla credenciais sensiveis.
- O frontend nao executa integracoes externas.

### Exemplo de padrao correto

```ts
// correto: frontend chama apenas o backend
await apiClient.get("/api/assistants");
```

### Exemplo de padrao incorreto

```ts
// incorreto: expor segredo ou chamar provider diretamente
await fetch("https://api.openai.com/v1/chat/completions", {
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
});
```

## 6. Backend

O backend e responsavel por:

- autenticacao
- autorizacao
- criptografia
- armazenamento
- integracao externa
- providers de IA
- execucao de tools
- execucao do runtime
- memoria
- logs
- auditoria
- custos

Toda logica de negocio deve permanecer no backend.

### Consequencia pratica

Se uma regra depende de seguranca, tenant, permissao, custo, auditoria ou integracao externa, ela pertence ao backend.

## 7. Banco de Dados

Regras:

- Multiempresa desde o primeiro dia
- Nunca misturar dados de empresas
- Utilizar chaves estrangeiras
- Criar indices adequados
- Utilizar soft delete quando fizer sentido
- Nao criar tabelas sem documentacao

### Boas praticas obrigatorias

- toda tabela principal deve considerar `company_id` quando houver isolamento por tenant
- toda relacao deve ser documentada
- todo indice relevante deve ser justificado
- toda mudanca de schema deve ser planejada

### Exemplo de regra de isolamento

- uma consulta de assistentes deve retornar apenas assistentes da empresa do usuario autenticado
- nunca buscar registros globais sem justificativa

## 8. Seguranca

Nunca:

- expor API Keys
- retornar Secrets
- salvar senhas em texto
- registrar tokens em logs
- confiar em dados do frontend

Sempre:

- validar entrada
- validar empresa
- validar usuario
- validar permissoes
- registrar auditoria

### Politicas de seguranca

- Secrets vivem somente no backend.
- Logs devem remover ou mascarar informacoes sensiveis.
- Toda integracao externa deve ser assinada ou autenticada.
- Toda chamada sensivel deve ter rastreabilidade.
- Toda operacao cross-tenant deve ser bloqueada.

### Exemplo de dado proibido em log

- token de acesso
- header `Authorization`
- senha em claro
- chave de API

## 9. Arquitetura

Sempre seguir arquitetura modular.

Motores previstos:

- Assistant Engine
- Runtime Engine
- Knowledge Engine
- Memory Engine
- Tool Engine
- Webhook Engine
- Channel Engine
- Cost Engine
- Logs Engine
- Security Engine

Nenhum modulo deve depender diretamente de outro sem interface clara.

### Regra de dependencia

- Modulos devem conversar por contratos ou interfaces bem definidas.
- Dependencias circulares devem ser evitadas.
- Lógica compartilhada deve ficar em camadas comuns e bem nomeadas.

## 10. Runtime

Fluxo obrigatorio:

Mensagem

Canal

Contexto

Assistente

Memoria

Conhecimento

Ferramenta

LLM

Validacao

Resposta

Logs

Consumo

Nunca inverter esta ordem sem justificativa tecnica.

### Objetivo do fluxo

O runtime deve garantir que a IA:

- receba contexto adequado
- consulte memoria e conhecimento quando aplicavel
- execute tools apenas quando permitido
- valide a saida antes de responder
- registre logs e consumo

## 11. Cubo.Chat

O Cubo.Chat e o centro da operacao.

Toda mensagem entra pelo Cubo.Chat.

Toda resposta sai pelo Cubo.Chat.

A IA nunca conversa diretamente com o WhatsApp.

Os canais sao responsabilidade do Cubo.Chat.

### Regra operacional

Se uma funcionalidade envolve canal, inbox, conversa ou mensagem final, ela deve respeitar o contrato do Cubo.Chat.

## 12. Providers

O sistema deve ser preparado para multiplos providers.

Nunca criar codigo dependente de apenas um provider.

Exemplos:

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- DeepSeek

Adicionar interface para futuros providers.

### Observacao

Mesmo que o MVP use um provider inicial, o desenho nao pode bloquear troca posterior.

## 13. Ferramentas

Toda Tool deve possuir:

- nome
- descricao
- parametros
- validacao
- timeout
- tratamento de erro
- logs
- auditoria

Nunca executar Tool sem contexto.

### Exemplo de responsabilidade da tool

- o backend decide se a tool pode executar
- a tool nao deve receber mais dados do que o necessario
- toda execucao deve ser rastreavel

## 14. Base de Conhecimento

Nunca utilizar prompt gigante.

Sempre utilizar base de conhecimento.

Sempre registrar quais documentos foram utilizados.

### Regra de uso

- conhecimento deve ser recuperado de forma controlada
- o runtime deve saber de onde veio a informacao
- a documentacao de origem deve ser auditavel

## 15. Memoria

A memoria deve ser controlada.

Nunca salvar informacoes sensiveis sem necessidade.

Toda memoria deve possuir:

- origem
- data
- expiracao
- empresa
- contato

### Observacao

Memoria nao e deposito livre de dados.
Somente registrar o que e realmente util para execucao futura.

## 16. Custos

Registrar:

- provider
- modelo
- tokens entrada
- tokens saida
- custo
- duracao
- assistente
- empresa
- canal

### Regra de custo

Toda execucao de IA deve ter rastreabilidade de consumo.
Custos devem ser estimaveis, auditaveis e agregaveis.

## 17. Logs

Todo processamento deve gerar logs.

Nunca ocultar erro.

Toda execucao deve poder ser reproduzida.

### Tipos de registro esperados

- log tecnico
- log de auditoria
- log de execucao
- log de erro

### Regra de depuracao

Se algo falhar, o erro deve ser observavel sem expor segredos.

## 18. Observabilidade

Cada execucao devera possuir timeline completa.

Mensagem

Contexto

Knowledge

Tool

Resposta

Tempo

Tokens

Custo

Status

### Objetivo

A equipe deve conseguir entender o que aconteceu em uma execucao sem depender de suposicoes.

## 19. Escalabilidade

O sistema deve suportar:

- milhares de empresas
- milhoes de mensagens
- multiplos canais
- multiplos modelos
- multiplos assistentes

Evitar qualquer decisao que dificulte esse crescimento.

### Principio prático

Nao otimizar precoce e perigosamente, mas tambem nao criar solucoes que so funcionem em pequena escala.

## 20. MVP

Durante o MVP NAO implementar:

- Marketplace
- Billing automatico
- Multi-provider avancado
- Flow Builder completo
- Builder para cliente final
- Automações complexas
- Analytics avancado

Implementar apenas o necessario para colocar clientes da Cubo.Chat em producao.

### Regra de foco

Se algo nao ajuda diretamente o primeiro go-live com seguranca, deve ficar fora do MVP.

## 21. Qualidade

Todo codigo novo deve:

- passar build
- passar typecheck
- passar lint
- manter tipagem
- manter documentacao
- manter testes quando existirem

Nunca considerar uma issue concluida sem essas validacoes.

### Consequencia

Codigo aceito sem validacao nao e considerado pronto.

## 22. Papel das IAs

Toda IA que trabalhar neste projeto deve agir como engenheira de software.

Nunca improvisar arquitetura.

Nunca implementar funcionalidades fora da issue atual.

Nunca alterar escopo do projeto.

Sempre seguir a documentacao existente.

Caso exista conflito entre documentacao e codigo, informar antes de implementar.

### Comportamento esperado

- ler primeiro
- entender o contexto
- executar exatamente o pedido
- parar quando houver duvida real

## 23. Regra Final

A documentacao do projeto possui prioridade sobre qualquer interpretacao.

Em caso de duvida:

1. Parar
2. Explicar a duvida
3. Esperar decisao

Nunca assumir comportamento automaticamente.

### Forma correta de agir diante de ambiguidade

- nao improvisar
- nao adivinhar requisitos
- nao expandir escopo sozinho

