# Frontend Typecheck Report

Data da execução: 8 de julho de 2026

Comando:

```bash
npx tsc --noEmit
```

## Erros atuais

### Não relacionados ao onboarding multiempresa/staging

1. [src/lib/assistants.ts](/Users/danilosimionato/Projetos/CuboIAStudio/src/lib/assistants.ts)
   Erro: `TS18049: 'assistant' is possibly 'null' or 'undefined'.`
   Motivo de não bloquear staging: utilitário legado sem relação direta com Companies, troca de tenant ou auth assinada.
   Plano futuro: endurecer null-checks no helper.

2. [src/lib/conversations.ts](/Users/danilosimionato/Projetos/CuboIAStudio/src/lib/conversations.ts)
   Erros:
   - `TS18049: 'conversation' is possibly 'null' or 'undefined'.`
   - `TS18049: 'conversation' is possibly 'null' or 'undefined'.`
   Motivo de não bloquear staging: helper legado fora do fluxo de Companies/Administração.
   Plano futuro: revisar guards e tipos de retorno.

3. [src/routes/_app.agentes.novo.tsx](/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.agentes.novo.tsx)
   Erro: `TS2307: Cannot find module '../components/assistant/AiIntegrationTest'.`
   Motivo de não bloquear staging: tela de criação de agente antiga, sem impacto direto no isolamento multiempresa.
   Plano futuro: restaurar ou remover import obsoleto.

4. [src/routes/_app.apps.google-calendar.tsx](/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.google-calendar.tsx)
   Erros:
   - `TS2353: 'installationId' does not exist in type ...`
   - `TS2304: Cannot find name 'ReactNode'.`
   Motivo de não bloquear staging: erros antigos de tipagem da rota e import.
   Plano futuro: alinhar search params do router e importar `ReactNode`.

5. [src/routes/_app.apps.index.tsx](/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.index.tsx)
   Erros:
   - `TS2339: Property 'credentials' does not exist on type 'AppInstallationItem'.`
   - `TS7006: Parameter 'c' implicitly has an 'any' type.`
   - `TS2322: Type '/apps/${string}' is not assignable ...`
   Motivo de não bloquear staging: catálogo de apps antigo, sem relação direta com a troca de empresa ativa.
   Plano futuro: alinhar contrato `AppInstallationItem` e tipagem de navegação.

6. [src/routes/_app.testes.tsx](/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.testes.tsx)
   Erros:
   - `TS2322: Type 'string | undefined' is not assignable to type 'string'.`
   - `TS2322: Type 'string | undefined' is not assignable to type 'string'.`
   Motivo de não bloquear staging: tela de testes manual antiga.
   Plano futuro: normalizar props obrigatórias.

## Resultado para o escopo atual

- Não ficaram erros de typecheck atribuídos às mudanças recentes de:
  - seletor de empresa
  - tela de Configurações/Administração de empresas
  - troca de empresa ativa
  - services de `companies`
  - tipos novos de Company/User/Membership usados no fluxo multiempresa atual

- Os erros restantes são débitos antigos e não impedem um staging interno focado em Companies, RBAC, auth assinada e isolamento por tenant.
