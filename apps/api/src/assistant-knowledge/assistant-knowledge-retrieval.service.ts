import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { AiService } from "../ai/ai.service";
import { CacheService } from "../cache/cache.service";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { Status } from "@prisma/client";
import {
  resolveAssistantKnowledgeScoreThreshold,
  type RagScoreThresholdSource,
} from "../assistant-conversations/runtime-context-manifest";
import { knowledgeScopeTagsMatch, normalizeKnowledgeScopeTags } from "./knowledge-scope-tags";
import {
  buildFactualEvidenceArtifact,
  createCanonicalKnowledgeContent,
  createEvidencePreview,
  type EvidencePreview,
  type FactualEvidenceArtifact,
} from "./knowledge-evidence";

const KNOWLEDGE_QUERY_EMBEDDING_CACHE_VERSION = "knowledge-query-embedding-v1";
const KNOWLEDGE_QUERY_EMBEDDING_MODEL = "text-embedding-3-small";
const KNOWLEDGE_QUERY_EMBEDDING_CACHE_TTL_SECONDS = 3_600;

export type KnowledgeQueryEmbeddingCacheStatus = "HIT" | "MISS" | "UNAVAILABLE";

export interface AssistantKnowledgeSearchInput {
  companyId?: string;
  assistantId: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
  /** Normalized domain tags authorized by the selected flow. */
  knowledgeScopeTags?: string[];
  user?: AuthenticatedUser;
  tenant: RequestTenant;
}

export interface AssistantKnowledgeSearchResult {
  query: string;
  candidateDocumentCount: number;
  eligibleDocumentCount: number;
  candidateChunkCount: number;
  eligibleChunkCount: number;
  totalChunksScanned: number;
  scoreThreshold: number;
  scoreThresholdSource: RagScoreThresholdSource;
  scoredChunkCount: number;
  dimensionMismatchCount: number;
  filteredOutCount: number;
  filteredOutScoreRange: { min: number; max: number } | null;
  scoredScoreRange: { min: number; max: number } | null;
  selectedScoreRange: { min: number; max: number } | null;
  topK: number;
  knowledgeScopeApplied: boolean;
  allowedKnowledgeTags: string[];
  knowledgeScopeNoMatch: boolean;
  scopedCandidateCount: number;
  rejectedOutOfScopeChunkCount: number;
  queryEmbeddingCacheStatus: KnowledgeQueryEmbeddingCacheStatus;
  results: Array<{
    knowledgeId: string;
    knowledgeTitle: string;
    chunkId: string;
    chunkIndex: number;
    contentPreview: string;
    score: number;
    metadata?: unknown;
  }>;
  warning?: string;
}

export type AssistantKnowledgeRuntimeSearchItem = {
  artifact: FactualEvidenceArtifact;
  preview: EvidencePreview;
  chunkIndex: number;
  metadata?: unknown;
};

export interface AssistantKnowledgeRuntimeSearchResult
  extends Omit<AssistantKnowledgeSearchResult, "results"> {
  results: AssistantKnowledgeRuntimeSearchItem[];
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

@Injectable()
export class AssistantKnowledgeRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async searchRelevantKnowledge(
    input: AssistantKnowledgeSearchInput,
  ): Promise<AssistantKnowledgeSearchResult> {
    const runtimeResult = await this.searchRelevantKnowledgeForRuntime(input);
    return {
      ...runtimeResult,
      results: runtimeResult.results.map((result) => ({
        knowledgeId: result.artifact.knowledgeId,
        knowledgeTitle: result.artifact.knowledgeTitle,
        chunkId: result.artifact.chunkId,
        chunkIndex: result.chunkIndex,
        contentPreview: result.preview.previewText,
        score: result.artifact.rankingScore,
        ...(result.metadata !== undefined ? { metadata: result.metadata } : {}),
      })),
    };
  }

  /**
   * Internal runtime contract. Canonical content is intentionally available
   * only through typed factual artifacts and must never be serialized by the
   * public controller.
   */
  async searchRelevantKnowledgeForRuntime(
    input: AssistantKnowledgeSearchInput,
  ): Promise<AssistantKnowledgeRuntimeSearchResult> {
    if (input.user && input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }
    if (input.companyId && input.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the specified company.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: { id: true },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    const trimmedQuery = input.query.trim();
    if (!trimmedQuery) {
      throw new BadRequestException("Query cannot be empty.");
    }

    const topK = input.topK && input.topK > 0 ? Math.min(input.topK, 20) : 5;
    const allowedKnowledgeTags = normalizeKnowledgeScopeTags(input.knowledgeScopeTags ?? []);
    const knowledgeScopeApplied = input.knowledgeScopeTags !== undefined;
    const normalizedThreshold = resolveAssistantKnowledgeScoreThreshold({
      assistantId: input.assistantId,
      explicitValue: input.scoreThreshold,
    });
    const threshold = normalizedThreshold.threshold;

    // 1. Fetch chunks that belong to ACTIVE and READY knowledge items.
    // Using findMany because we will do in-memory Cosine Similarity.
    // Note: If chunks exceed ~50,000 this will be heavy on RAM.
    // In the future this should be replaced by a pgvector raw query.
    // Some isolated legacy tests provide a minimal retrieval Prisma mock. Counts are
    // telemetry only, so preserve retrieval behavior when those optional delegates
    // are absent while production Prisma always supplies the exact values.
    const prismaForDiagnostics = this.prisma as unknown as {
      assistantKnowledge?: { count?: (args: unknown) => Promise<number> };
      assistantKnowledgeChunk?: { count?: (args: unknown) => Promise<number> };
    };
    const countDocuments = prismaForDiagnostics.assistantKnowledge?.count;
    const countChunks = prismaForDiagnostics.assistantKnowledgeChunk?.count;
    const [candidateDocumentCount, eligibleDocumentCount, candidateChunkCount, chunks] =
      await Promise.all([
        countDocuments
          ? countDocuments({
              where: {
                companyId: input.tenant.companyId,
                assistantId: input.assistantId,
              },
            })
          : Promise.resolve(0),
        countDocuments
          ? countDocuments({
              where: {
                companyId: input.tenant.companyId,
                assistantId: input.assistantId,
                status: Status.ACTIVE,
                processingStatus: "READY",
              },
            })
          : Promise.resolve(0),
        countChunks
          ? countChunks({
              where: {
                companyId: input.tenant.companyId,
                assistantId: input.assistantId,
              },
            })
          : Promise.resolve(0),
        this.prisma.assistantKnowledgeChunk.findMany({
          where: {
            companyId: input.tenant.companyId,
            assistantId: input.assistantId,
            status: Status.ACTIVE,
            knowledge: {
              status: Status.ACTIVE,
              processingStatus: "READY",
            },
          },
          select: {
            id: true,
            knowledgeId: true,
            chunkIndex: true,
            content: true,
            embedding: true,
            embeddingDimension: true,
            knowledge: {
              select: {
                title: true,
                metadata: true,
              },
            },
          },
        }),
      ]);

    const scopedChunks = knowledgeScopeApplied
      ? chunks.filter((chunk) =>
          knowledgeScopeTagsMatch({
            scopeTags: allowedKnowledgeTags,
            metadata: chunk.knowledge.metadata,
          }),
        )
      : chunks;
    const rejectedOutOfScopeChunkCount = knowledgeScopeApplied
      ? chunks.length - scopedChunks.length
      : 0;
    const knowledgeScopeNoMatch = knowledgeScopeApplied && scopedChunks.length === 0;

    if (scopedChunks.length === 0) {
      return {
        query: trimmedQuery,
        candidateDocumentCount,
        eligibleDocumentCount,
        candidateChunkCount,
        eligibleChunkCount: 0,
        totalChunksScanned: 0,
        scoreThreshold: threshold,
        scoreThresholdSource: normalizedThreshold.source,
        scoredChunkCount: 0,
        dimensionMismatchCount: 0,
        filteredOutCount: 0,
        filteredOutScoreRange: null,
        scoredScoreRange: null,
        selectedScoreRange: null,
        topK,
        knowledgeScopeApplied,
        allowedKnowledgeTags,
        knowledgeScopeNoMatch,
        scopedCandidateCount: 0,
        rejectedOutOfScopeChunkCount,
        queryEmbeddingCacheStatus: this.cacheService ? "MISS" : "UNAVAILABLE",
        results: [],
        warning: knowledgeScopeApplied
          ? "Nenhum conhecimento ativo e preparado (READY) corresponde às tags do escopo selecionado."
          : "Nenhum chunk de conhecimento ativo e preparado (READY) foi encontrado para este agente.",
      };
    }

    // 2. Generate embedding for the query
    const embeddingCacheKey = [
      KNOWLEDGE_QUERY_EMBEDDING_CACHE_VERSION,
      input.tenant.companyId,
      input.assistantId,
      KNOWLEDGE_QUERY_EMBEDDING_MODEL,
      createHash("sha256").update(trimmedQuery.toLocaleLowerCase("pt-BR")).digest("hex"),
    ].join(":");
    let queryVector: number[] | null = null;
    let queryEmbeddingCacheStatus: KnowledgeQueryEmbeddingCacheStatus = this.cacheService
      ? "MISS"
      : "UNAVAILABLE";
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<unknown>(embeddingCacheKey);
        if (
          Array.isArray(cached) &&
          cached.length > 0 &&
          cached.every((value) => typeof value === "number" && Number.isFinite(value))
        ) {
          queryVector = cached;
          queryEmbeddingCacheStatus = "HIT";
        }
      } catch {
        queryEmbeddingCacheStatus = "MISS";
      }
    }
    if (!queryVector) {
      const queryEmbeddingResult = await this.aiService.generateEmbedding({
        companyId: input.tenant.companyId,
        text: trimmedQuery,
        model: KNOWLEDGE_QUERY_EMBEDDING_MODEL,
      });
      queryVector = queryEmbeddingResult.embedding;
      if (this.cacheService) {
        try {
          await this.cacheService.set(
            embeddingCacheKey,
            queryVector,
            KNOWLEDGE_QUERY_EMBEDDING_CACHE_TTL_SECONDS,
          );
        } catch {
          // Cache is an optimization only. Canonical evidence still comes from PostgreSQL.
        }
      }
    }

    // 3. Calculate similarities
    const scoredChunks = scopedChunks
      .map((chunk) => {
        // Ensure dimensions match
        const chunkVector = chunk.embedding as number[];
        if (!chunkVector || chunkVector.length !== queryVector.length) {
          return null; // Ignore chunks with dimension mismatch
        }

        const score = cosineSimilarity(queryVector, chunkVector);
        return {
          chunk,
          score,
        };
      })
      .filter((item): item is { chunk: (typeof chunks)[number]; score: number } => item !== null);

    const filteredOut = scoredChunks.filter((item) => item.score < threshold);
    const filteredOutCount = filteredOut.length;
    const filteredOutScoreRange = filteredOut.length
      ? {
          min: Number(Math.min(...filteredOut.map((item) => item.score)).toFixed(4)),
          max: Number(Math.max(...filteredOut.map((item) => item.score)).toFixed(4)),
        }
      : null;
    const acceptedChunks = scoredChunks.filter((item) => item.score >= threshold);

    // 4. Sort descending
    acceptedChunks.sort((a, b) => b.score - a.score);

    // 5. Take topK
    const topResults = acceptedChunks.slice(0, topK);

    const scoreRange = (values: number[]): { min: number; max: number } | null =>
      values.length
        ? {
            min: Number(Math.min(...values).toFixed(4)),
            max: Number(Math.max(...values).toFixed(4)),
          }
        : null;

    return {
      query: trimmedQuery,
      candidateDocumentCount,
      eligibleDocumentCount,
      candidateChunkCount,
      eligibleChunkCount: scopedChunks.length,
      totalChunksScanned: scopedChunks.length,
      scoreThreshold: threshold,
      scoreThresholdSource: normalizedThreshold.source,
      scoredChunkCount: scoredChunks.length,
      dimensionMismatchCount: scopedChunks.length - scoredChunks.length,
      filteredOutCount,
      filteredOutScoreRange,
      scoredScoreRange: scoreRange(scoredChunks.map((item) => item.score)),
      selectedScoreRange: scoreRange(topResults.map((item) => item.score)),
      topK,
      knowledgeScopeApplied,
      allowedKnowledgeTags,
      knowledgeScopeNoMatch,
      scopedCandidateCount: scopedChunks.length,
      rejectedOutOfScopeChunkCount,
      queryEmbeddingCacheStatus,
      results: topResults.map((res) => {
        const canonicalContent = createCanonicalKnowledgeContent(res.chunk.content);
        const artifact = buildFactualEvidenceArtifact({
          chunkId: res.chunk.id,
          knowledgeId: res.chunk.knowledgeId,
          knowledgeTitle: res.chunk.knowledge.title,
          canonicalContent,
          rankingScore: Number(res.score.toFixed(4)),
          selectionReason: "score_at_or_above_threshold",
          sourceType: "KNOWLEDGE_CHUNK",
        });
        return {
          artifact,
          preview: createEvidencePreview({
            chunkId: res.chunk.id,
            canonicalContent,
            maxLength: 250,
          }),
          chunkIndex: res.chunk.chunkIndex,
          metadata: res.chunk.knowledge.metadata ?? undefined,
        };
      }),
    };
  }
}
