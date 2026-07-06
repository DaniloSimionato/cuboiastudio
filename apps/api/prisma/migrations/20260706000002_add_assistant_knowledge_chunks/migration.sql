-- AlterTable
ALTER TABLE "assistant_knowledge" ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "assistant_knowledge_chunks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "knowledge_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "embedding_model" TEXT NOT NULL,
    "embedding_dimension" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_knowledge_chunks_company_id_idx" ON "assistant_knowledge_chunks"("company_id");

-- CreateIndex
CREATE INDEX "assistant_knowledge_chunks_assistant_id_idx" ON "assistant_knowledge_chunks"("assistant_id");

-- CreateIndex
CREATE INDEX "assistant_knowledge_chunks_knowledge_id_idx" ON "assistant_knowledge_chunks"("knowledge_id");

-- AddForeignKey
ALTER TABLE "assistant_knowledge_chunks" ADD CONSTRAINT "assistant_knowledge_chunks_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_knowledge_chunks" ADD CONSTRAINT "assistant_knowledge_chunks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_knowledge_chunks" ADD CONSTRAINT "assistant_knowledge_chunks_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "assistant_knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

