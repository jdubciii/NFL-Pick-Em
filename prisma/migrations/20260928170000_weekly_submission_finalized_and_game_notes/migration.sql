-- AlterTable
ALTER TABLE "games" ADD COLUMN "commissioner_notes" TEXT;

-- AlterTable
ALTER TABLE "weekly_submissions" ADD COLUMN "is_finalized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "weekly_submissions_pool_id_week_number_is_finalized_idx" ON "weekly_submissions"("pool_id", "week_number", "is_finalized");
