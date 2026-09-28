-- AlterTable
ALTER TABLE "penalty_ledger" ALTER COLUMN "delta" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "pick_results" ALTER COLUMN "points_awarded" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "pool_member_stats" ALTER COLUMN "total_shots_drank" SET DEFAULT 0.00,
ALTER COLUMN "total_shots_drank" SET DATA TYPE DECIMAL(5,2);

-- CreateTable
CREATE TABLE "weekly_submissions" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_number" INTEGER NOT NULL,
    "tie_breaker_prediction" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_submissions_pool_id_user_id_week_number_key" ON "weekly_submissions"("pool_id", "user_id", "week_number");

-- AddForeignKey
ALTER TABLE "weekly_submissions" ADD CONSTRAINT "weekly_submissions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_submissions" ADD CONSTRAINT "weekly_submissions_pool_id_user_id_fkey" FOREIGN KEY ("pool_id", "user_id") REFERENCES "pool_memberships"("pool_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_submissions" ADD CONSTRAINT "weekly_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
