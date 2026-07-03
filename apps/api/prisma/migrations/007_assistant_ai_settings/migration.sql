-- AlterTable
ALTER TABLE "assistants"
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION;
