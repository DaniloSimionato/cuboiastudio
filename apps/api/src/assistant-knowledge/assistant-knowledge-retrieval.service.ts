import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AiService } from "../ai/ai.service";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { Status } from "@prisma/client";
import {
  resolveAssistantKnowledgeScoreThreshold,
  type RagScoreThresholdSource,
} from "../assistant-conversations/runtime-context-manifest";

export interface AssistantKnowledgeSearchInput {
  companyId?: string;
  assistantId: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
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
  ) {}

  async searchRelevantKnowledge(
    input: AssistantKnowledgeSearchInput,
  ): Promise<AssistantKnowledgeSearchResult> {
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
              where: { companyId: input.tenant.companyId, assistantId: input.assistantId },
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
              where: { companyId: input.tenant.companyId, assistantId: input.assistantId },
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

    if (chunks.length === 0) {
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
        results: [],
        warning:
          "Nenhum chunk de conhecimento ativo e preparado (READY) foi encontrado para este agente.",
      };
    }

    // 2. Generate embedding for the query
    const queryEmbeddingResult = await this.aiService.generateEmbedding({
      companyId: input.tenant.companyId,
      text: trimmedQuery,
    });
    const queryVector = queryEmbeddingResult.embedding;

    // 3. Calculate similarities
    const scoredChunks = chunks
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
      eligibleChunkCount: chunks.length,
      totalChunksScanned: chunks.length,
      scoreThreshold: threshold,
      scoreThresholdSource: normalizedThreshold.source,
      scoredChunkCount: scoredChunks.length,
      dimensionMismatchCount: chunks.length - scoredChunks.length,
      filteredOutCount,
      filteredOutScoreRange,
      scoredScoreRange: scoreRange(scoredChunks.map((item) => item.score)),
      selectedScoreRange: scoreRange(topResults.map((item) => item.score)),
      topK,
      results: topResults.map((res) => ({
        knowledgeId: res.chunk.knowledgeId,
        knowledgeTitle: res.chunk.knowledge.title,
        chunkId: res.chunk.id,
        chunkIndex: res.chunk.chunkIndex,
        // Preview de até 250 chars para não saturar resposta JSON (o frontend é só p/ debug)
        contentPreview:
          res.chunk.content.substring(0, 250) + (res.chunk.content.length > 250 ? "..." : ""),
        score: Number(res.score.toFixed(4)),
        metadata: res.chunk.knowledge.metadata ?? undefined,
      })),
    };
  }
}
