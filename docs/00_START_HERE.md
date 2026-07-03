# 00_START_HERE.md

Este e o ponto de entrada obrigatorio para qualquer IA ou desenvolvedor que trabalhar no Cubo AI Studio.

O projeto possui documentacao modular.

Nenhuma implementacao deve comecar sem ler a documentacao indicada nesta ordem.

## Setup local validado

Para subir o backend local validado do projeto, use este fluxo:

```bash
npm run setup:local
npm run api:start
npm run smoke:backend
```

Contexto operacional atual:

- backend local em `http://localhost:3001`
- frontend local em `http://localhost:8080`
- Postgres local deste projeto em `localhost:5433`
- detalhes completos em `docs/BACKEND_SETUP.md`
- validacao ponta a ponta em `docs/SMOKE_TEST_BACKEND.md`
- integracao CuboChat/Chatwoot documentada em `docs/CUBOCHAT_INTEGRATION.md`

## 1. AI_CONTEXT.md

Objetivo: entender o negocio.

Este documento responde perguntas como:

- O que e a Cubo.Chat?
- O que e o Cubo AI Studio?
- Qual problema estamos resolvendo?
- Quem utilizara o sistema?
- Qual e o MVP?
- O que nao faz parte do MVP?

Sem compreender este documento nenhuma implementacao deve comecar.

## 2. PROJECT_RULES.md

Objetivo: entender como o projeto deve ser desenvolvido.

Contem:

- filosofia
- arquitetura
- seguranca
- padroes
- qualidade
- fluxo de desenvolvimento

Todas as implementacoes devem seguir essas regras.

## 3. FRONTEND_OVERVIEW.md

Objetivo: entender como o frontend foi construído.

Explica:

- stack
- paginas
- componentes
- services
- tipos
- mocks
- estrutura

## 4. SECURITY_FRONTEND.md

Objetivo: entender todas as regras de seguranca do frontend.

Nenhuma implementacao pode violar estas regras.

## 5. FRONTEND_FIXES.md

Objetivo: conhecer ajustes realizados durante a estabilizacao do frontend.

Ler este documento ajuda a evitar regressões.

## 6. PROJECT_REVIEW.md

Objetivo: conhecer a auditoria tecnica completa do projeto.

Ajuda a entender pontos fortes e fracos da implementacao inicial.

## 7. BACKEND_BACKLOG.md

Objetivo: entender toda a arquitetura planejada para o backend.

Nao implementar antes de ler.

## 8. BACKEND_ISSUES.md

Objetivo: saber exatamente qual Issue deve ser implementada.

Toda implementacao devera seguir uma Issue existente.

Nunca implementar funcionalidades fora das Issues.

## Fluxo obrigatorio para qualquer IA

Toda IA deve seguir exatamente este fluxo:

1. Ler `00_START_HERE.md`
2. Ler `AI_CONTEXT.md`
3. Ler `PROJECT_RULES.md`
4. Ler a documentacao especifica da area que sera alterada
5. Identificar a Issue
6. Implementar somente a Issue
7. Rodar `build`, `lint` e `typecheck`
8. Atualizar documentacao caso necessario
9. Gerar resumo tecnico

Nunca alterar multiplas Issues simultaneamente.

## Estrutura da documentacao

Arquivos existentes e seu proposito:

- `AI_CONTEXT.md` - contexto de negocio e produto
- `PROJECT_RULES.md` - regras oficiais de desenvolvimento
- `FRONTEND_OVERVIEW.md` - visao tecnica do frontend atual
- `SECURITY_FRONTEND.md` - regras de seguranca do frontend
- `FRONTEND_FIXES.md` - registros dos ajustes feitos no frontend
- `PROJECT_REVIEW.md` - auditoria tecnica completa do projeto
- `BACKEND_BACKLOG.md` - backlog tecnico do backend
- `BACKEND_ISSUES.md` - epics e issues priorizadas do backend
- `BACKEND_SETUP.md` - setup local oficial do backend validado
- `CUBOCHAT_INTEGRATION.md` - guia principal da integracao CuboChat/Chatwoot validada
- `CHATWOOT_E2E_QUICKSTART.md` - roteiro curto de validacao ponta a ponta
- `CHATWOOT_E2E_TEST.md` - checklist completo de teste E2E da integracao
- `API_LOCAL_DIAGNOSTICS.md` - troubleshooting local da API e do tunnel
- `DATABASE.md` - schema, operacao local e comandos oficiais de banco
- `AUTH.md` - auth dev, tenant e RBAC do backend
- `SMOKE_TEST_BACKEND.md` - smoke test ponta a ponta validado

## Principios do projeto

- arquitetura antes de codigo
- seguranca antes de velocidade
- simplicidade antes de complexidade
- documentacao faz parte do produto
- backend centraliza regras de negocio
- frontend apenas apresenta informacoes

## Como agir em caso de duvida

Caso exista conflito entre:

- documentacao
- codigo
- Issue

A IA deve:

1. Parar a implementacao
2. Explicar o conflito
3. Solicitar decisao
4. Nunca assumir comportamento automaticamente

## Objetivo final

O Cubo AI Studio deve se tornar o modulo oficial de Inteligencia Artificial da Cubo.Chat.

Todo desenvolvimento deve priorizar:

- confiabilidade
- escalabilidade
- seguranca
- facilidade de implantacao
- facilidade de manutencao

O sucesso do projeto sera medido pela capacidade de colocar clientes da Cubo.Chat em producao com uma IA previsivel, estavel e facil de evoluir.
