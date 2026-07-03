# AI_CONTEXT.md

Documento de contexto permanente para qualquer IA que participe do desenvolvimento do Cubo AI Studio.

Este documento existe para que qualquer agente entenda o negocio antes de entender o codigo.

## 1. O que e a Cubo.Chat

A Cubo.Chat e uma plataforma omnichannel de atendimento.

Hoje ela integra canais como:

- WhatsApp Oficial
- WAHA
- UAZAPI
- Instagram
- Facebook
- Webchat

No futuro, outros canais poderao ser adicionados.

A Cubo.Chat e o centro de toda comunicacao.

A IA nunca conversa diretamente com os canais.

Toda comunicacao entra e sai pela Cubo.Chat.

## 2. O que e o Cubo AI Studio

O Cubo AI Studio e o modulo oficial de Inteligencia Artificial da Cubo.Chat.

Seu objetivo e permitir que empresas configurem Assistentes IA capazes de atender clientes utilizando:

- prompts estruturados
- base de conhecimento
- memoria
- ferramentas
- webhooks
- fluxos
- integracoes

Inicialmente, o uso sera interno pela equipe de implantacao.

No futuro, o sistema podera ser liberado para clientes finais.

## 3. Qual problema estamos resolvendo

Hoje muitos clientes utilizam IA baseada apenas em prompts enormes.

Isso gera:

- alucinacao
- respostas inconsistentes
- dificil manutencao
- dependencia de pessoas especificas
- perda de clientes
- baixa confiabilidade

O Cubo AI Studio nasce para resolver exatamente esse problema.

Nesta fase, algumas rotas de preview do assistant apenas simulam respostas de forma determinística usando knowledge manual. Isso ainda nao e IA real nem RAG real.

As execucoes validas desse preview sao registradas em logs para auditoria e evolucao futura, mas ainda nao representam conversa, memoria ou runtime real de IA.

A rota oficial de runtime inicial do assistant agora tenta o provider real quando ele esta habilitado e configurado, mas continua com fallback deterministico seguro quando a IA real nao puder ser usada. Ela ainda nao usa embeddings e nao conversa diretamente com canais.

A fase operacional validada segue com fallback deterministico preservado: o runtime atual pode usar IA real no backend quando habilitado, o frontend de demo ja consome assistants, base de conhecimento e conversas persistidas, e a proxima evolucao deve ser planejada antes de qualquer integracao externa.

O plano tecnico do "cerebro" da IA esta sendo documentado em `docs/AI_RUNTIME_PLAN.md` para separar com clareza provider, prompt, runtime, logs, knowledge, tools e canais.

AI-001 agora criou a primeira camada backend-only de provider real com diagnostico seguro, e AI-003 passou a ligar o runtime de conversa ao provider quando a configuracao permite, mantendo fallback deterministico.
AI-002 agora persistiu `instructions`, `model` e `temperature` no Assistant e tornou essas configuracoes editaveis na UI.
AI-004 agora adicionou configuracao de IA por tenant/empresa na tela de configuracoes, com API key cifrada no backend e fallback global apenas quando o tenant nao possui configuracao propria.
AI-005 agora iniciou o Runtime Pipeline v1 baseado em 7 partes do Assistente: mensagem inicial, instrucoes, contexto, modelo/temperatura, inatividade, saida e resumo. A tela `/testes` mostra essas partes no debug, e novas conversas podem receber `initialMessage` persistida como mensagem inicial do assistant.

O endpoint `GET /diagnostics/ai` existe apenas para inspeção segura e teste manual.
As rotas `GET /settings/ai`, `PATCH /settings/ai`, `POST /settings/ai/test` e `DELETE /settings/ai/api-key` atendem a configuracao de tenant e exigem `settings:read` ou `settings:write` conforme o caso.

BE-022 continua reservado para Tools no backlog oficial.
BE-023 ja criou a estrutura inicial de conversas e mensagens persistidas do runtime, que agora pode operar com IA real no backend ou com fallback deterministico seguro.
A integraçao de IA real no `/testes` agora pode acontecer pelo runtime de conversa quando o backend estiver habilitado, mas continua segura e dependente da configuracao backend-only.
A AI-005 nao adiciona Tools, canais externos, embeddings, RAG vetorial, timer real de inatividade ou observabilidade avancada. Essas frentes seguem futuras.
A demo local também foi estabilizada para as portas comuns do Vite em desenvolvimento, sem alterar o comportamento determinístico nem introduzir IA real.

## 4. Objetivo do MVP

O MVP possui um unico objetivo:

Permitir que clientes da Cubo.Chat utilizem uma IA confiavel em producao.

Nao tentar resolver todos os problemas do mercado.

Nao criar uma plataforma generica.

O foco e atender muito bem os clientes atuais.

## 5. Quem utilizara o sistema

### Administrador

- administra a plataforma
- acompanha configuracoes globais
- supervisiona seguranca, custos e operacao

### Equipe de Implantacao

- configura assistentes
- cria conhecimento
- ajusta fluxos
- valida a entrega para cada cliente

### Equipe de Suporte

- acompanha logs
- investiga falhas
- ajuda na manutencao operacional

### Cliente Administrador

- futuro perfil de acesso
- podera configurar seus proprios assistentes
- podera gerenciar sua operacao com autonomia controlada

### Parceiros

- futuro perfil de acesso
- podera auxiliar implantacoes e operacoes autorizadas

## 6. Como funciona hoje

O cenarios atual possui limitacoes importantes:

- dependencias de ferramentas externas
- grande uso de prompts gigantes
- baixa reutilizacao
- dificil manutencao
- pouca observabilidade
- integracoes frageis

Isso torna a operacao mais arriscada e menos previsivel.

## 7. Como queremos que funcione

A visao futura desejada e:

Empresa

Assistentes

Conhecimento

Ferramentas

Fluxos

Canais

IA

Logs

Consumo

Tudo integrado ao Cubo.Chat.

## 8. Filosofia do Produto

O Cubo AI Studio deve ser:

- simples
- previsivel
- confiavel
- escalavel
- seguro
- modular

Nunca depender de um unico provider de IA.

Nunca depender de uma unica integracao.

## 9. Como a IA deve pensar

Ao tomar decisoes, a IA deve priorizar sempre:

Seguranca

Confiabilidade

Manutencao

Escalabilidade

Performance

Novas funcionalidades

Nunca sacrificar arquitetura para implementar rapidamente uma feature.

## 10. Como decisoes devem ser tomadas

Em caso de duvida, a IA deve se perguntar:

- Essa decisao ajuda o MVP?
- Ajuda clientes atuais?
- Reduz churn?
- Facilita implantacao?
- Aumenta confiabilidade?

Se a resposta for nao, a funcionalidade provavelmente deve ficar para depois.

## 11. O que nao faz parte do MVP

Nao faz parte do MVP:

- Marketplace
- Billing automatico
- Marketplace de Skills
- Flow Builder avancado
- Analytics avancado
- Builder liberado para cliente final
- Integracoes complexas
- Multi-provider avancado
- Automações complexas
- Multi-tenant extremamente avancado

Tudo isso ficara para versoes futuras.

## 12. Visao de longo prazo

Futuramente, o Cubo AI Studio pode evoluir para uma plataforma independente de criacao de Assistentes IA.

Por enquanto, essa nao e a prioridade atual.

A prioridade absoluta e fortalecer a Cubo.Chat.

## 13. Principio mais importante

O objetivo do Cubo AI Studio nao e impressionar com quantidade de funcionalidades.

O objetivo e entregar uma IA confiavel, previsivel e facil de implantar para os clientes da Cubo.Chat.

Toda decisao tecnica deve respeitar este principio.

## 14. Como qualquer IA deve atuar neste projeto

Toda IA deve:

- Ler primeiro toda a documentacao
- Respeitar `PROJECT_RULES.md`
- Respeitar `BACKEND_ISSUES.md`
- Respeitar `BACKEND_BACKLOG.md`
- Nunca alterar arquitetura sem justificativa
- Nunca implementar funcionalidades fora da issue atual
- Sempre explicar decisoes importantes
- Sempre priorizar simplicidade para o MVP
- Sempre considerar que o projeto sera mantido por varios desenvolvedores e IAs ao longo dos anos

## 15. Mensagem Final

Este projeto deve ser tratado como um produto de longo prazo.

O codigo deve ser escrito para durar muitos anos.

A documentacao e parte do produto.

A arquitetura e prioridade.

A seguranca e obrigatoria.

A escalabilidade e esperada.

A confiabilidade e o principal diferencial competitivo da Cubo.Chat.
