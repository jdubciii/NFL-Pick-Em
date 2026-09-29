-- CreateEnum
CREATE TYPE "PenaltyMediaStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "penalty_media" (
    "id" UUID NOT NULL,
    "penalty_id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "status" "PenaltyMediaStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalty_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "penalty_media_penalty_id_key" ON "penalty_media"("penalty_id");

-- CreateIndex
CREATE INDEX "penalty_media_pool_id_user_id_idx" ON "penalty_media"("pool_id", "user_id");

-- AddForeignKey
ALTER TABLE "penalty_media" ADD CONSTRAINT "penalty_media_penalty_id_fkey" FOREIGN KEY ("penalty_id") REFERENCES "penalty_ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_media" ADD CONSTRAINT "penalty_media_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_media" ADD CONSTRAINT "penalty_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_media" ADD CONSTRAINT "penalty_media_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
