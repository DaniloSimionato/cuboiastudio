# Base de Conhecimento e RAG (Retrieval-Augmented Generation)

Este documento descreve como funciona a base de conhecimento no Cubo.Chat e a integração com a Inteligência Artificial através de RAG.

## Como funciona o Conhecimento

Cada assistente (agente) no Cubo.Chat pode possuir uma "Base de Conhecimento", que são fragmentos de informações, FAQs, URLs, ou transcrições inseridas pelo administrador.

- O conhecimento sempre terá o status de `ACTIVE` ou `INACTIVE`.
- Somente arquivos com o status de ativação = `ACTIVE` poderão ser lidos pelo sistema, tanto para preparo quanto para runtime.

## Como preparar para IA

Adicionar um arquivo de conhecimento não instrui a inteligência artificial automaticamente. Primeiro, ele deve ser vetorizado e processado.

1. Acesse a edição do Agente e vá para a aba **Conhecimento**.
2. Clique no botão **"Preparar para IA"** nos conhecimentos que não estiverem `READY`.
3. O Backend em background quebrará o documento em parágrafos semânticos (chunks) com sobreposição e gerará Embeddings via modelo configurado (ex: `text-embedding-3-small`).
4. Quando finalizado, o documento assume o status `READY`.
5. Qualquer falha retornará o status `ERROR`, impedindo seu uso.

## Como testar o RAG

1. Crie ou edite conhecimentos e garanta que eles estão com a label `READY`.
2. Acesse o **Preview** (botão de teste visual com chat).
3. Haverá uma opção em tela: **"Usar conhecimento preparado neste teste"**.
4. Faça uma pergunta que exija informações do conhecimento. O painel exibirá os chunks interceptados e qual a semelhança computada.

## Como ativar o RAG com segurança no Atendimento Real

Para habilitar a inteligência artificial a ler seus arquivos na produção:

1. Vá na aba **Prompt**.
2. No final da tela, ative a chave **Usar conhecimento preparado no atendimento real** (`ragEnabled`).
3. O agente passará a processar e enviar documentos a todas as novas interações de usuários via integrações do Chatwoot.
4. **Importante**: Conhecimentos `INACTIVE` ou não `READY` NUNCA serão trafegados para a IA, protegendo o runtime.
5. Se por algum erro a flag falhar (ex: provider de Embedding ficar off), a resposta será dada no modo tradicional sem invenções.

## Limitações Atuais e Próximos Passos (pgvector)

- **Vectorização em Memória**: O cálculo de *Cosine Similarity* hoje roda na memória RAM do Container Node.JS puxando uma coluna do tipo `Float[]` diretamente do banco de dados (Prisma).
- **Limite Recomendado**: É altamente recomendado não ultrapassar ~50.000 chunks por agente nesta etapa do projeto sob risco de enfileiramento (Event Loop Block) no serviço da API.
- **Futuro (`pgvector`)**: Após o rollout escalado, uma futura migration transformará o `Float[]` para uma coluna de indexação `vector(1536)` (extensão pgvector). Dessa forma, a distância de cossenos será delegada nativamente no banco de dados, liberando a CPU e memória da nossa API.
