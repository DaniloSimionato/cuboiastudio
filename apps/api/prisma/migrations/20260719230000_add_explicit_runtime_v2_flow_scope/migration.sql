-- Optional and additive: existing flows remain V1_ONLY by interpretation.
ALTER TABLE "assistant_flows"
  ADD COLUMN "runtimeScope" TEXT,
  ADD COLUMN "runtimeCategory" TEXT,
  ADD COLUMN "runtimeIntent" TEXT,
  ADD COLUMN "runtimeAuthority" TEXT,
  ADD COLUMN "runtimeDirectOnly" BOOLEAN;
