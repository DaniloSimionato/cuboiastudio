# Multiempresa no Staging

## Objetivo

Permitir cadastrar várias empresas/clientes no mesmo ambiente de homologação sem misturar dados entre tenants.

## O que mudou

- Cada empresa continua sendo identificada por `companyId`.
- Usuários agora podem pertencer a mais de uma empresa via `company_memberships`.
- O usuário possui uma `activeCompanyId` persistida no backend.
- O frontend usa a empresa ativa do usuário e não depende mais de `x-dev-company-id` hardcoded.
- Headers `x-dev-*` ficam restritos ao ambiente local (`development`/`test`).
- Em staging/produção o backend espera identidade autenticada por headers confiáveis do ambiente:
  - `x-auth-user-id`
  - `x-auth-user-email`
  - `x-auth-user-name` opcional

## Como cadastrar uma nova empresa

### Pela interface

1. Entre em `Configurações`.
2. Abra a seção `Administração de empresas`.
3. Clique em `Nova empresa`.
4. Preencha:
   - nome fantasia
   - razão social opcional
   - CNPJ opcional
   - status
   - observações opcionais
   - `Criar assistente demo` apenas se quiser explicitamente
5. Salve.

Resultado:

- a empresa nasce vazia
- sem conversas
- sem knowledge
- sem Chatwoot
- sem apps/Google Agenda
- sem logs herdados
- sem copiar dados de outro cliente

O usuário criador recebe vínculo com a nova empresa, papel admin nessa empresa e a empresa passa a poder ser selecionada como contexto ativo.

### Pela API

`POST /companies`

Exemplo:

```json
{
  "name": "Clínica Exemplo",
  "legalName": "Clínica Exemplo LTDA",
  "document": "12.345.678/0001-99",
  "status": "ACTIVE",
  "notes": "Tenant de homologação para time comercial",
  "createDemoAssistant": false
}
```

## Como trocar a empresa ativa

### Pela interface

Use o seletor de empresa na sidebar ou o botão `Entrar na empresa` na tela de Configurações.

### Pela API

`POST /companies/active`

```json
{
  "companyId": "SEU_COMPANY_ID"
}
```

## Fluxo recomendado para preparar um cliente novo

1. Criar a empresa.
2. Trocar para a empresa criada.
3. Configurar IA em `Configurações`.
4. Conectar Chatwoot se necessário.
5. Instalar Google Agenda/apps somente para essa empresa.
6. Criar assistentes, knowledge e fluxos do zero.
7. Validar testes sem impactar outros tenants.

## Segurança

- Listagens, detalhes, updates e deletes devem usar a empresa ativa do usuário.
- `AssistantFlows` e `AssistantBehavior` agora validam o vínculo do assistente com a empresa antes de ler/alterar.
- Logs, apps, Chatwoot, conversas e knowledge continuam filtrados por `companyId`.
- Tokens, webhooks e segredos não são retornados nas respostas seguras.
