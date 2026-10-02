-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'OK', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "inbox_messages" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_expires_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "sent_at" TIMESTAMP(3),
    "retried_by" UUID,
    "retried_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_offsets_hours" integer[] NOT NULL DEFAULT ARRAY[24,2],
    "unsubscribe_token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "meta" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inbox_messages_user_id_read_at_created_at_idx" ON "inbox_messages"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_messages_user_id_dedupe_key_key" ON "inbox_messages"("user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_dedupe_key_key" ON "outbox_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_attempt_at_idx" ON "outbox_events"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_unsubscribe_token_key" ON "notification_preferences"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_retried_by_fkey" FOREIGN KEY ("retried_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Decision #15: Deny-by-default Data API access
REVOKE ALL ON inbox_messages FROM anon, authenticated;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON outbox_events FROM anon, authenticated;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON notification_preferences FROM anon, authenticated;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON job_runs FROM anon, authenticated;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

-- Enforce constraints per Directive 4.2 and R-12.2-AK
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0);

CREATE OR REPLACE FUNCTION check_reminder_offsets(offsets integer[])
RETURNS boolean AS $$
BEGIN
    IF offsets IS NULL THEN
        RETURN false;
    END IF;
    IF cardinality(offsets) > 5 THEN
        RETURN false;
    END IF;
    RETURN (SELECT COALESCE(bool_and(x BETWEEN 1 AND 168), true) FROM unnest(offsets) x);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

REVOKE ALL ON FUNCTION check_reminder_offsets(integer[]) FROM PUBLIC, anon, authenticated;

ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_offsets_check CHECK (check_reminder_offsets(reminder_offsets_hours));


