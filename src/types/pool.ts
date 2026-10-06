export type TieHandlingStrategy = 'ALL_TIED' | 'TIEBREAKER_ONLY' | 'SPLIT_PENALTY';
export type AntiPeekingRevealAt = 'LOCK_TIME' | 'GAME_FINAL';
export type PickingMode = 'STRAIGHT_UP' | 'AGAINST_SPREAD';
export type TiebreakerGameTarget = 'MONDAY_NIGHT' | 'LAST_GAME_OF_WEEK';
export type LockMode = 'ROLLING' | 'GLOBAL_FIRST_GAME';
export type TieBreakerType =
  | 'TOTAL_POINTS_MONDAY'
  | 'TOTAL_POINTS_LAST_GAME'
  | 'CLOSEST_ABSOLUTE'
  | 'CLOSEST_WITHOUT_GOING_OVER'
  | string;

export interface AntiPeekingSettings {
  enabled?: boolean;
  reveal_at?: AntiPeekingRevealAt;
  revealAt?: AntiPeekingRevealAt;
  [key: string]: any;
}

export interface TiebreakerSettings {
  game_target?: TiebreakerGameTarget;
  gameTarget?: TiebreakerGameTarget;
  metric?: string;
  [key: string]: any;
}

export interface PenaltySettings {
  penalty_name?: string;
  penaltyName?: string;
  shots_per_loss?: number;
  shotsPerLoss?: number;
  dead_place_penalty?: number;
  deadPlacePenalty?: number;
  tie_handling?: TieHandlingStrategy;
  tieHandling?: TieHandlingStrategy;
  [key: string]: any;
}

export interface PoolSettings {
  lock_offset?: number;
  lockOffset?: number;
  lock_mode?: LockMode;
  lockMode?: LockMode;
  excluded_game_windows?: string[];
  excludedGameWindows?: string[];
  tiebreaker_type?: TieBreakerType;
  tieBreakerType?: TieBreakerType;
  points_per_win?: number;
  pointsPerWin?: number;
  win_value?: number;
  winValue?: number;
  picking_mode?: PickingMode;
  pickingMode?: PickingMode;
  hide_picks_until_kickoff?: boolean;
  hidePicksUntilKickoff?: boolean;
  anti_peeking?: AntiPeekingSettings;
  antiPeeking?: AntiPeekingSettings;
  tiebreaker?: TiebreakerSettings;
  penalties?: PenaltySettings;
  [key: string]: any;
}

export interface MatrixMemberColumn {
  user_id: string;
  email: string;
  displayName?: string;
}

export interface MatrixGameRow {
  game_id: string;
  external_game_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_time: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  home_score: number | null;
  away_score: number | null;
  spread?: number | null;
}

export interface MatrixPickCell {
  pick_id: string | null;
  selected_team_id: string | null;
  is_masked: boolean;
  is_correct?: boolean | null;
  points_awarded?: number | null;
}

export interface MatrixMemberSummary {
  user_id: string;
  weekly_wins: number;
  tiebreaker_guess: number | null;
  cumulative_shots: number;
}

export interface MatrixResponsePayload {
  metadata: {
    pool_id: string;
    week_number: number | string;
    picking_mode: PickingMode;
    hide_picks_until_kickoff: boolean;
  };
  columns: MatrixMemberColumn[];
  rows: MatrixGameRow[];
  cells: Record<string, Record<string, MatrixPickCell>>; // game_id -> user_id -> MatrixPickCell
  summary: Record<string, MatrixMemberSummary>; // user_id -> MatrixMemberSummary
}

export type PenaltyMediaStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface PenaltyMediaResponse {
  id: string;
  penalty_id: string;
  pool_id: string;
  user_id: string;
  storage_path: string;
  media_type: string;
  status: PenaltyMediaStatus;
  confirmed_by?: string | null;
  created_at: string;
}

