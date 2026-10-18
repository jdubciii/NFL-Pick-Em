-- 03_proposal_b_games_import.sql
-- Proposal B: Canonical Games Import (Week 6 Candidate Manifest)
-- Verified against Live ESPN Capture (SHA-256: f0826e586f9ccef338076212bd96708ae1d0ce007d7500e7208bc45ee29c3bae)

INSERT INTO public.games (
  external_game_id, home_team_id, away_team_id, kickoff_time, status, season, season_type, week
) VALUES
  ('401872995', 'DEN', 'SEA', '2026-10-16T00:15:00Z', 'FINAL'::"GameStatus",     2026, 2, 6),
  ('401872996', 'JAX', 'HOU', '2026-10-18T13:30:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401872997', 'CLE', 'BAL', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401872998', 'PHI', 'CAR', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401872999', 'ATL', 'CHI', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873000', 'NYG', 'NO',  '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873001', 'NE',  'NYJ', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873002', 'TB',  'PIT', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873003', 'IND', 'TEN', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873004', 'LAR', 'ARI', '2026-10-18T20:05:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873005', 'LV',  'BUF', '2026-10-18T20:25:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873006', 'KC',  'LAC', '2026-10-18T20:25:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873007', 'GB',  'DAL', '2026-10-19T00:20:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873008', 'SF',  'WAS', '2026-10-20T00:15:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6)
ON CONFLICT (external_game_id) DO UPDATE SET
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  kickoff_time = EXCLUDED.kickoff_time,
  status = EXCLUDED.status,
  season = EXCLUDED.season,
  season_type = EXCLUDED.season_type,
  week = EXCLUDED.week;
