-- REHEARSAL SCHEMA DUMP BEFORE DROP (Incident I-1 Evidence)
-- Captured at 2026-09-30T03:48:45.475Z

-- COLUMNS:
[
  {
    "table_name": "audit_logs",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "audit_logs",
    "column_name": "actor_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "audit_logs",
    "column_name": "action",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "audit_logs",
    "column_name": "target_entity_id",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "audit_logs",
    "column_name": "old_value",
    "ordinal_position": 5,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "jsonb"
  },
  {
    "table_name": "audit_logs",
    "column_name": "new_value",
    "ordinal_position": 6,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "jsonb"
  },
  {
    "table_name": "audit_logs",
    "column_name": "timestamp",
    "ordinal_position": 7,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "games",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "games",
    "column_name": "external_game_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "games",
    "column_name": "home_team_id",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "games",
    "column_name": "away_team_id",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "games",
    "column_name": "kickoff_time",
    "ordinal_position": 5,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "games",
    "column_name": "status",
    "ordinal_position": 6,
    "column_default": "'SCHEDULED'::rehearsal.\"GameStatus\"",
    "is_nullable": "NO",
    "udt_name": "GameStatus"
  },
  {
    "table_name": "games",
    "column_name": "home_score",
    "ordinal_position": 7,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "int4"
  },
  {
    "table_name": "games",
    "column_name": "away_score",
    "ordinal_position": 8,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "int4"
  },
  {
    "table_name": "games",
    "column_name": "commissioner_notes",
    "ordinal_position": 9,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "text"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "pool_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "user_id",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "week_number",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "int4"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "delta",
    "ordinal_position": 5,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "numeric"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "reason",
    "ordinal_position": 6,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "created_by",
    "ordinal_position": 7,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_ledger",
    "column_name": "created_at",
    "ordinal_position": 8,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "penalty_media",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_media",
    "column_name": "penalty_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_media",
    "column_name": "pool_id",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_media",
    "column_name": "user_id",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_media",
    "column_name": "storage_path",
    "ordinal_position": 5,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "penalty_media",
    "column_name": "media_type",
    "ordinal_position": 6,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "penalty_media",
    "column_name": "status",
    "ordinal_position": 7,
    "column_default": "'PENDING'::rehearsal.\"PenaltyMediaStatus\"",
    "is_nullable": "NO",
    "udt_name": "PenaltyMediaStatus"
  },
  {
    "table_name": "penalty_media",
    "column_name": "confirmed_by",
    "ordinal_position": 8,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "uuid"
  },
  {
    "table_name": "penalty_media",
    "column_name": "created_at",
    "ordinal_position": 9,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "pick_results",
    "column_name": "pick_id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pick_results",
    "column_name": "is_correct",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "bool"
  },
  {
    "table_name": "pick_results",
    "column_name": "points_awarded",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "numeric"
  },
  {
    "table_name": "pick_results",
    "column_name": "finalized_at",
    "ordinal_position": 4,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "picks",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "picks",
    "column_name": "pool_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "picks",
    "column_name": "user_id",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "picks",
    "column_name": "game_id",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "picks",
    "column_name": "selected_team_id",
    "ordinal_position": 5,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "text"
  },
  {
    "table_name": "picks",
    "column_name": "submitted_by",
    "ordinal_position": 6,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "picks",
    "column_name": "created_at",
    "ordinal_position": 7,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "pool_member_stats",
    "column_name": "pool_id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pool_member_stats",
    "column_name": "user_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pool_member_stats",
    "column_name": "total_shots_drank",
    "ordinal_position": 3,
    "column_default": "0.00",
    "is_nullable": "NO",
    "udt_name": "numeric"
  },
  {
    "table_name": "pool_member_stats",
    "column_name": "first_place_finishes",
    "ordinal_position": 4,
    "column_default": "0",
    "is_nullable": "NO",
    "udt_name": "int4"
  },
  {
    "table_name": "pool_member_stats",
    "column_name": "dead_place_finishes",
    "ordinal_position": 5,
    "column_default": "0",
    "is_nullable": "NO",
    "udt_name": "int4"
  },
  {
    "table_name": "pool_member_stats",
    "column_name": "updated_at",
    "ordinal_position": 6,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "pool_memberships",
    "column_name": "pool_id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pool_memberships",
    "column_name": "user_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pool_memberships",
    "column_name": "status",
    "ordinal_position": 3,
    "column_default": "'ACTIVE'::rehearsal.\"Status\"",
    "is_nullable": "NO",
    "udt_name": "Status"
  },
  {
    "table_name": "pools",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pools",
    "column_name": "name",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "pools",
    "column_name": "admin_id",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "pools",
    "column_name": "settings",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "jsonb"
  },
  {
    "table_name": "pools",
    "column_name": "status",
    "ordinal_position": 5,
    "column_default": "'ACTIVE'::rehearsal.\"Status\"",
    "is_nullable": "NO",
    "udt_name": "Status"
  },
  {
    "table_name": "users",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "users",
    "column_name": "email",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "users",
    "column_name": "password_hash",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "text"
  },
  {
    "table_name": "users",
    "column_name": "role",
    "ordinal_position": 4,
    "column_default": "'USER'::rehearsal.\"Role\"",
    "is_nullable": "NO",
    "udt_name": "Role"
  },
  {
    "table_name": "users",
    "column_name": "created_at",
    "ordinal_position": 5,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "pool_id",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "user_id",
    "ordinal_position": 3,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "week_number",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "int4"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "tie_breaker_prediction",
    "ordinal_position": 5,
    "column_default": null,
    "is_nullable": "YES",
    "udt_name": "numeric"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "created_at",
    "ordinal_position": 6,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "is_finalized",
    "ordinal_position": 7,
    "column_default": "false",
    "is_nullable": "NO",
    "udt_name": "bool"
  },
  {
    "table_name": "weekly_submissions",
    "column_name": "updated_at",
    "ordinal_position": 8,
    "column_default": "CURRENT_TIMESTAMP",
    "is_nullable": "NO",
    "udt_name": "timestamp"
  },
  {
    "table_name": "weekly_wrapups",
    "column_name": "pool_id",
    "ordinal_position": 1,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  },
  {
    "table_name": "weekly_wrapups",
    "column_name": "week_number",
    "ordinal_position": 2,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "int4"
  },
  {
    "table_name": "weekly_wrapups",
    "column_name": "applied_at",
    "ordinal_position": 3,
    "column_default": "now()",
    "is_nullable": "NO",
    "udt_name": "timestamptz"
  },
  {
    "table_name": "weekly_wrapups",
    "column_name": "applied_by",
    "ordinal_position": 4,
    "column_default": null,
    "is_nullable": "NO",
    "udt_name": "uuid"
  }
]

-- TRIGGERS:
[
  {
    "event_object_table": "penalty_ledger",
    "trigger_name": "penalty_ledger_no_update_delete",
    "action_timing": "BEFORE",
    "event_manipulation": "DELETE",
    "action_statement": "EXECUTE FUNCTION rehearsal.penalty_ledger_prevent_update_delete()"
  },
  {
    "event_object_table": "penalty_ledger",
    "trigger_name": "penalty_ledger_no_update_delete",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION rehearsal.penalty_ledger_prevent_update_delete()"
  }
]
