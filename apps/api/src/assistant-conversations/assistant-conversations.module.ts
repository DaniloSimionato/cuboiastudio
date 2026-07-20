import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AttachmentInterpreterModule } from "../attachments/attachment-interpreter.module";
import { ChatwootModule } from "../chatwoot/chatwoot.module";
import { AppsModule } from "../apps/apps.module";
import { AssistantKnowledgeModule } from "../assistant-knowledge/assistant-knowledge.module";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";
import { PromptCompilerModule } from "../prompt-compiler/prompt-compiler.module";
import { IntentRouterModule } from "../intent-router/intent-router.module";
import { AssistantSecurityRulesModule } from "../assistant-security-rules/assistant-security-rules.module";
import { ContactMemoriesModule } from "../contact-memories/contact-memories.module";
import { AssistantConversationsController } from "./assistant-conversations.controller";
import { AssistantConversationsService } from "./assistant-conversations.service";
import { InMemoryConversationStateStore } from "../runtime-v2/conversation-state-store";
import { resolveRuntimeV2StateStoreMode } from "../runtime-v2/runtime-v2-feature-flag";
import {
  PrismaConversationStateStore,
  RUNTIME_V2_STATE_STORE,
} from "../runtime-v2/prisma-conversation-state-store";
import { RuntimeV2ShadowOrchestrator } from "../runtime-v2/runtime-v2-shadow-orchestrator";
import { RuntimeV2ShadowIntegrationService } from "../runtime-v2/runtime-v2-shadow-integration.service";
import { OfficialStructuredEvidenceAdapter } from "../runtime-v2/official-structured-evidence.adapter";
import { RagEvidenceAdapter } from "../runtime-v2/rag-evidence.adapter";
import { MemoryEvidenceAdapter } from "../runtime-v2/memory-evidence.adapter";
import { RuntimeV2CandidateResponseProvider } from "../runtime-v2/runtime-v2-candidate-response-provider";
import { RuntimeV2CandidateResponseGenerator } from "../runtime-v2/candidate-response";
import { PromptCompilerService } from "../prompt-compiler/prompt-compiler.service";
import { ConversationStateResponseExecutionStore } from "../runtime-v2/conversation-state-response-execution-store";
import { RuntimeV2ResponseExecutionCoordinator } from "../runtime-v2/response-execution-coordinator";
import { ResponseGenerationRouter } from "./response-generation-router";
import { V1ResponseGenerationExecutor } from "./v1-response-generation-executor";
import {
  RuntimeV2PrimaryResponseExecutor,
  V2_PRIMARY_RESPONSE_EXECUTOR,
} from "./v2-primary-response-executor";
import { PrismaService } from "../database/prisma.service";
import { AssistantSecurityRulesService } from "../assistant-security-rules/assistant-security-rules.service";
import { RuntimeV2ResponseExecutionAdministrationService } from "../runtime-v2/response-execution-administration";

@Module({
  imports: [
    AiModule,
    AttachmentInterpreterModule,
    ChatwootModule,
    AppsModule,
    AssistantKnowledgeModule,
    PromptCompilerModule,
    IntentRouterModule,
    AssistantSecurityRulesModule,
    ContactMemoriesModule,
  ],
  controllers: [AssistantConversationsController],
  providers: [
    InMemoryConversationStateStore,
    PrismaConversationStateStore,
    OfficialStructuredEvidenceAdapter,
    RagEvidenceAdapter,
    MemoryEvidenceAdapter,
    RuntimeV2CandidateResponseProvider,
    {
      provide: ConversationStateResponseExecutionStore,
      useFactory: (stateStore: PrismaConversationStateStore) =>
        new ConversationStateResponseExecutionStore(stateStore),
      inject: [PrismaConversationStateStore],
    },
    {
      provide: RuntimeV2ResponseExecutionCoordinator,
      useFactory: (store: ConversationStateResponseExecutionStore) =>
        new RuntimeV2ResponseExecutionCoordinator({ store }),
      inject: [ConversationStateResponseExecutionStore],
    },
    {
      provide: V2_PRIMARY_RESPONSE_EXECUTOR,
      useFactory: () => new RuntimeV2PrimaryResponseExecutor(),
    },
    {
      provide: RuntimeV2ResponseExecutionAdministrationService,
      useFactory: (
        prisma: PrismaService,
        stateStore: InMemoryConversationStateStore | PrismaConversationStateStore,
        responseExecutionStore: ConversationStateResponseExecutionStore,
        securityRules: AssistantSecurityRulesService,
        coordinator: RuntimeV2ResponseExecutionCoordinator,
      ) =>
        new RuntimeV2ResponseExecutionAdministrationService({
          prisma,
          stateStore,
          responseExecutionStore,
          securityRules,
          coordinator,
        }),
      inject: [
        PrismaService,
        RUNTIME_V2_STATE_STORE,
        ConversationStateResponseExecutionStore,
        AssistantSecurityRulesService,
        RuntimeV2ResponseExecutionCoordinator,
      ],
    },
    {
      provide: ResponseGenerationRouter,
      useFactory: (
        coordinator: RuntimeV2ResponseExecutionCoordinator,
        v2Executor: RuntimeV2PrimaryResponseExecutor,
        administration: RuntimeV2ResponseExecutionAdministrationService,
      ) =>
        new ResponseGenerationRouter({
          executeV1: async (input) => new V1ResponseGenerationExecutor().execute(input),
          coordinator,
          v2Executor,
          administration,
        }),
      inject: [
        RuntimeV2ResponseExecutionCoordinator,
        V2_PRIMARY_RESPONSE_EXECUTOR,
        RuntimeV2ResponseExecutionAdministrationService,
      ],
    },

    {
      provide: RUNTIME_V2_STATE_STORE,
      useFactory: (
        inMemoryStore: InMemoryConversationStateStore,
        postgresStore: PrismaConversationStateStore,
      ) => (resolveRuntimeV2StateStoreMode() === "POSTGRES" ? postgresStore : inMemoryStore),
      inject: [InMemoryConversationStateStore, PrismaConversationStateStore],
    },
    {
      provide: RuntimeV2ShadowOrchestrator,
      useFactory: (
        stateStore: InMemoryConversationStateStore | PrismaConversationStateStore,
        officialEvidenceAdapter: OfficialStructuredEvidenceAdapter,
        ragEvidenceAdapter: RagEvidenceAdapter,
        memoryEvidenceAdapter: MemoryEvidenceAdapter,
        candidateProvider: RuntimeV2CandidateResponseProvider,
        promptCompiler: PromptCompilerService,
        knowledgeRetrieval: AssistantKnowledgeRetrievalService,
      ) =>
        new RuntimeV2ShadowOrchestrator(
          stateStore,
          process.env,
          undefined,
          officialEvidenceAdapter,
          ragEvidenceAdapter,
          memoryEvidenceAdapter,
          new RuntimeV2CandidateResponseGenerator(candidateProvider, promptCompiler),
          knowledgeRetrieval,
        ),
      inject: [
        RUNTIME_V2_STATE_STORE,
        OfficialStructuredEvidenceAdapter,
        RagEvidenceAdapter,
        MemoryEvidenceAdapter,
        RuntimeV2CandidateResponseProvider,
        PromptCompilerService,
        AssistantKnowledgeRetrievalService,
      ],
    },
    RuntimeV2ShadowIntegrationService,
    AssistantConversationsService,
  ],
  exports: [AssistantConversationsService],
})
export class AssistantConversationsModule {}
