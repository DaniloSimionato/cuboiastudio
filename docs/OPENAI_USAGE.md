# Consumo real da OpenAI

O painel **Consumo IA** consulta os endpoints administrativos `Usage` e `Costs` da OpenAI no backend. O custo vem de `Costs`, que é o dado apropriado para conciliar com a fatura; tokens e requests vêm de `Usage`.

## Configuração por ambiente

No ambiente da API, configure somente no servidor:

```env
OPENAI_ADMIN_API_KEY=sk-admin-...
```

A chave deve ser criada por um Organization Owner na página de Admin Keys da OpenAI. Não use a chave comum de inferência para essa variável e nunca a exponha ao frontend.

## Configuração por empresa

Em **Configurações → Configuração de IA**, preencha **Projeto OpenAI (custos reais)** com o identificador `proj_...` que corresponde àquela empresa.

Cada empresa deve usar seu próprio projeto OpenAI. Isso é o que permite ao backend filtrar os dados oficiais por tenant sem mostrar consumo de outra empresa.

## Publicação

1. Aplique a migração Prisma `20260723000000_add_openai_usage_project_id`.
2. Publique a API com `OPENAI_ADMIN_API_KEY` no gerenciador de segredos.
3. Informe o ID de projeto no painel da empresa.
4. Abra **Consumo IA** e use **Atualizar**.

Quando a chave administrativa ou o projeto não estiver configurado, o painel mostra uma mensagem de configuração em vez de dados estimados. A OpenAI pode apresentar uma pequena defasagem entre o uso e o custo consolidado.
