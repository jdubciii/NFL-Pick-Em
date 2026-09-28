-- CreateTable
CREATE TABLE "pool_member_stats" (
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_shots_drank" INTEGER NOT NULL DEFAULT 0,
    "first_place_finishes" INTEGER NOT NULL DEFAULT 0,
    "dead_place_finishes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_member_stats_pkey" PRIMARY KEY ("pool_id","user_id")
);

-- CreateTable
CREATE TABLE "penalty_ledger" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_number" INTEGER,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalty_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "penalty_ledger_pool_id_user_id_idx" ON "penalty_ledger"("pool_id", "user_id");

-- AddForeignKey
ALTER TABLE "pool_member_stats" ADD CONSTRAINT "pool_member_stats_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_member_stats" ADD CONSTRAINT "pool_member_stats_pool_id_user_id_fkey" FOREIGN KEY ("pool_id", "user_id") REFERENCES "pool_memberships"("pool_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_ledger" ADD CONSTRAINT "penalty_ledger_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_ledger" ADD CONSTRAINT "penalty_ledger_pool_id_user_id_fkey" FOREIGN KEY ("pool_id", "user_id") REFERENCES "pool_memberships"("pool_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_ledger" ADD CONSTRAINT "penalty_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
