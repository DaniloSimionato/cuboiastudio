# Correção do Fluxo de Conversa Chatwoot

O objetivo deste plano é corrigir os problemas no fluxo de mensagens do Chatwoot sem introduzir mudanças na UI ou outras áreas.

## Problemas e Soluções Propostas

### 1. Buffer de Mensagens e Debounce
**Problema:** Mensagens chegam separadas e a IA responde a cada uma individualmente, ignorando o tempo de buffer, resultando em múltiplas chamadas à IA para a mesma conversa.
**Solução:** Implementar um buffer em memória (`Map`) no `ChatwootWebhookService`.
- Ao receber um webhook de `message_created`, verificamos se o `messageBufferEnabled` está ativo e `messageBufferSeconds > 0`.
- Se sim, armazenamos o payload no buffer e limpamos o `setTimeout` anterior para aquele `conversationId` (debounce).
- Quando o tempo expirar, executamos o job combinando o texto e anexos de todos os payloads daquele intervalo, e fazemos uma única chamada ao `AssistantConversationsService.sendMessage`.
- Logs estruturados serão adicionados para facilitar o diagnóstico (`bufferedMessageCount`, `jobSkippedBecauseNewerExists`, etc).

### 2. Divisão em Blocos Naturais
**Problema:** A opção "Blocos Naturais" provavelmente não estava implementada no backend ou a IA estava sendo chamada múltiplas vezes.
**Solução:** No `AssistantConversationsService`, ao enviar a resposta para o Chatwoot (`sendChatwootOutboundText`), se `splitResponseStyle === 'NATURAL_BLOCKS'`, dividiremos a resposta da IA (separada por `\n\n`) em múltiplos blocos e enviaremos mensagens separadas, adicionando um pequeno intervalo entre elas para garantir a ordem correta, sem chamar o LLM múltiplas vezes.

### 3. Saudações e Encerramentos Repetitivos
**Problema:** A IA repete "Bom dia, [Nome]" e "Se precisar de mais ajuda..." em todas as mensagens.
**Solução:** Ajustar o prompt de sistema gerado em `buildConversationPromptMessages` (`assistant-runtime.ts`) para incluir regras estritas de conversação:
- Não repetir saudações se a conversa já estiver em andamento.
- Ir direto ao ponto após a primeira interação.
- Não repetir o nome do cliente em toda resposta.
- Não finalizar sempre com ofertas de ajuda repetitivas.

## Alterações Planejadas

### `apps/api/src/chatwoot/chatwoot-webhook.service.ts`
- Adicionar mapa de buffers de timeout por `externalConversationId`.
- Modificar `processMessageCreated` para interceptar e agendar o processamento quando aplicável.
- Processar mensagens em lote e montar um único `DTO` (texto concatenado, anexos mesclados).
- Logs seguros adicionados conforme requisitado.

### `apps/api/src/assistant-conversations/assistant-conversations.service.ts`
- Adicionar `splitResponseStyle` e `splitResponseEnabled` no select de `Assistant`.
- Modificar a rotina de envio ao Chatwoot para iterar e dividir o texto quando `splitResponseStyle === 'NATURAL_BLOCKS'`.

### `apps/api/src/assistants/assistant-runtime.ts`
- Incluir as regras comportamentais explícitas no `buildConversationPromptMessages`.

## Verification Plan
- Rodar o build de produção do backend (`npm --prefix apps/api run build`).
- Rodar os testes no Chatwoot (enviar múltiplas mensagens picadas e verificar se a IA responde apenas uma vez agrupando as informações).
- Validar se a resposta gerada com NATURAL_BLOCKS chega em mensagens separadas (sem chamar o LLM a cada bloco).
