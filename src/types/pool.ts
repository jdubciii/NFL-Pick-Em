export type TieHandlingStrategy = 'ALL_TIED' | 'TIEBREAKER_ONLY' | 'SPLIT_PENALTY';

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
  points_per_win?: number;
  pointsPerWin?: number;
  win_value?: number;
  winValue?: number;
  penalties?: PenaltySettings;
  [key: string]: any;
}
