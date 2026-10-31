import React, { useState } from 'react';
import {
  Home,
  Plane,
  Star,
  RotateCcw,
  Zap,
  Check,
  Flame,
  Users,
  ChevronDown
} from 'lucide-react';
import type { GameItem } from './WeeklyPicks';

export type PresetType = 'ALL_HOME' | 'ALL_AWAY' | 'FAVORITES' | 'CONTRARIAN' | 'MIRROR' | 'CLEAR';

export interface MatrixMemberOption {
  user_id: string;
  email: string;
  displayName?: string;
}

export interface MatrixCellData {
  pick_id: string | null;
  selected_team_id: string | null;
  is_masked: boolean;
  is_correct?: boolean | null;
  points_awarded?: number | null;
}

export interface PickPresetControlsProps {
  games: GameItem[];
  isGameLocked: (game: GameItem) => boolean;
  onApplyPreset: (updatedPicks: Record<string, string | null>, presetName: string, presetType?: PresetType) => void;
  matrixCells?: Record<string, Record<string, MatrixCellData>>;
  matrixMembers?: MatrixMemberOption[];
  hidePicksUntilKickoff?: boolean;
  currentUserId?: string;
  disabled?: boolean;
}

export const PickPresetControls: React.FC<PickPresetControlsProps> = ({
  games,
  isGameLocked,
  onApplyPreset,
  matrixCells = {},
  matrixMembers = [],
  currentUserId,
  disabled = false,
}) => {
  const [activePreset, setActivePreset] = useState<PresetType | null>(null);
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');
  const [showRivalDropdown, setShowRivalDropdown] = useState<boolean>(false);
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);

  // Filter rivals (competitors other than the active user)
  const rivalOptions = matrixMembers.filter((m) => m.user_id !== currentUserId);
  const rivalList = rivalOptions;

  /**
   * Deterministic 'All Home' Auto-Fill:
   * Selects homeTeamId for every unlocked game in the active slate.
   */
  const handleAllHome = () => {
    if (disabled) return;
    const newPicks: Record<string, string | null> = {};
    let affectedCount = 0;

    for (const game of games) {
      if (!isGameLocked(game)) {
        newPicks[game.id] = game.homeTeamId;
        affectedCount++;
      }
    }

    setActivePreset('ALL_HOME');
    onApplyPreset(newPicks, `Applied 'All Home' preset across ${affectedCount} unlocked games`, 'ALL_HOME');
  };

  /**
   * Deterministic 'All Away' Auto-Fill:
   * Selects awayTeamId for every unlocked game in the active slate.
   */
  const handleAllAway = () => {
    if (disabled) return;
    const newPicks: Record<string, string | null> = {};
    let affectedCount = 0;

    for (const game of games) {
      if (!isGameLocked(game)) {
        newPicks[game.id] = game.awayTeamId;
        affectedCount++;
      }
    }

    setActivePreset('ALL_AWAY');
    onApplyPreset(newPicks, `Applied 'All Away' preset across ${affectedCount} unlocked games`, 'ALL_AWAY');
  };

  /**
   * Deterministic 'Favorites' Auto-Fill:
   * Evaluates game.spread if available (negative spread indicates favorite).
   * Defaults to home team if spread is 0 or unlisted (home field advantage).
   */
  const handleFavorites = () => {
    if (disabled) return;
    const newPicks: Record<string, string | null> = {};
    let affectedCount = 0;

    for (const game of games) {
      if (!isGameLocked(game)) {
        if (typeof game.spread === 'number') {
          if (game.spread < 0) {
            newPicks[game.id] = game.homeTeamId;
          } else if (game.spread > 0) {
            newPicks[game.id] = game.awayTeamId;
          } else {
            newPicks[game.id] = game.homeTeamId;
          }
        } else {
          newPicks[game.id] = game.homeTeamId;
        }
        affectedCount++;
      }
    }

    setActivePreset('FAVORITES');
    onApplyPreset(newPicks, `Applied 'Favorites' preset across ${affectedCount} unlocked games`, 'FAVORITES');
  };

  /**
   * Social 'Contrarian' Auto-Fill:
   * Analyzes competitor pick distributions from visible matrix cells.
   * Auto-fills the least selected (minority) team for each unlocked matchup.
   */
  const handleContrarian = () => {
    if (disabled) return;
    const newPicks: Record<string, string | null> = {};
    let affectedCount = 0;

    for (const game of games) {
      if (!isGameLocked(game)) {
        const gameCells = matrixCells[game.id] || {};
        let homePicks = 0;
        let awayPicks = 0;

        for (const [memberId, cell] of Object.entries(gameCells)) {
          if (memberId !== currentUserId && cell.selected_team_id) {
            if (cell.selected_team_id === game.homeTeamId) homePicks++;
            if (cell.selected_team_id === game.awayTeamId) awayPicks++;
          }
        }

        // Pick the least popular team (or away underdog if tied)
        if (homePicks > awayPicks) {
          newPicks[game.id] = game.awayTeamId;
        } else if (awayPicks > homePicks) {
          newPicks[game.id] = game.homeTeamId;
        } else {
          newPicks[game.id] = game.awayTeamId;
        }
        affectedCount++;
      }
    }

    setActivePreset('CONTRARIAN');
    onApplyPreset(newPicks, `Applied 'Contrarian' preset across ${affectedCount} unlocked games (Faded the league consensus)`, 'CONTRARIAN');
  };

  /**
   * Social 'Mirror Rival' Auto-Fill:
   * Clones visible picks from a chosen competitor/rival from matrix cells.
   */
  const handleMirrorRival = (rivalId: string) => {
    if (disabled || !rivalId) return;
    setSelectedRivalId(rivalId);
    setShowRivalDropdown(false);

    const newPicks: Record<string, string | null> = {};
    let affectedCount = 0;
    const rival = rivalList.find((r) => r.user_id === rivalId);
    const rivalLabel = rival?.displayName || rival?.email || 'Rival';

    for (const game of games) {
      if (!isGameLocked(game)) {
        const rivalCell = matrixCells[game.id]?.[rivalId];
        if (rivalCell && rivalCell.selected_team_id) {
          newPicks[game.id] = rivalCell.selected_team_id;
        } else {
          // Deterministic pseudo-pick for chosen rival
          const charCode = (rival?.email || rivalId).charCodeAt(0) || 0;
          const pickHome = (game.id.charCodeAt(game.id.length - 1) + charCode) % 2 === 0;
          newPicks[game.id] = pickHome ? game.homeTeamId : game.awayTeamId;
        }
        affectedCount++;
      }
    }

    setActivePreset('MIRROR');
    onApplyPreset(newPicks, `Cloned picks from ${rivalLabel} across ${affectedCount} unlocked games`, 'MIRROR');
  };

  /**
   * Clear All Unlocked Picks:
   */
  const handleClearAll = () => {
    if (disabled) return;
    const newPicks: Record<string, string | null> = {};
    let affectedCount = 0;

    for (const game of games) {
      if (!isGameLocked(game)) {
        newPicks[game.id] = null;
        affectedCount++;
      }
    }

    setActivePreset('CLEAR');
    onApplyPreset(newPicks, `Cleared picks for ${affectedCount} unlocked games`, 'CLEAR');
  };

  return (
    <div
      id="pick-preset-controls"
      className="p-1.5 px-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:gap-4 animate-fade-in"
    >
      {/* Accordion Header / Mobile Bar Trigger */}
      <div
        onClick={() => setMobileExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full md:w-auto cursor-pointer md:cursor-default select-none py-0.5 sm:py-0"
      >
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
            <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-[11px] sm:text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
              <span className="hidden sm:inline">Quick Fill Presets & Social Accelerators</span>
              <span className="sm:hidden">⚡ Quick Presets (Home, Away, Favorites)</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold hidden xs:inline">
                Active
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
              Deterministic auto-fills and social algorithms (Contrarian & Mirror Rival).
            </p>
          </div>
        </div>

        {/* Mobile Accordion Expand/Collapse Indicator */}
        <div className="md:hidden flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
          <span>{mobileExpanded ? 'Hide' : 'Presets ▾'}</span>
        </div>
      </div>

      {/* Preset Action Buttons (Collapsible on mobile, always visible on md+) */}
      <div className={`${mobileExpanded ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800`}>
        {/* Section 1: Standard Presets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {/* All Home */}
          <button
            type="button"
            id="preset-all-home"
            disabled={disabled}
            onClick={handleAllHome}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activePreset === 'ALL_HOME'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Auto-fill all home teams"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Home</span>
            {activePreset === 'ALL_HOME' && <Check className="w-3 h-3 text-cyan-400" />}
          </button>

          {/* All Away */}
          <button
            type="button"
            id="preset-all-away"
            disabled={disabled}
            onClick={handleAllAway}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activePreset === 'ALL_AWAY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Auto-fill all away teams"
          >
            <Plane className="w-3.5 h-3.5 text-indigo-400" />
            <span>Away</span>
            {activePreset === 'ALL_AWAY' && <Check className="w-3 h-3 text-indigo-400" />}
          </button>

          {/* Favorites */}
          <button
            type="button"
            id="preset-favorites"
            disabled={disabled}
            onClick={handleFavorites}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activePreset === 'FAVORITES'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Auto-fill based on betting spread / favorites"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Favorites</span>
            {activePreset === 'FAVORITES' && <Check className="w-3 h-3 text-amber-400" />}
          </button>
        </div>

        {/* Section 2: Social Presets (Contrarian & Mirror Rival) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 relative">
          {/* Contrarian Button */}
          <button
            type="button"
            id="preset-contrarian"
            disabled={disabled}
            onClick={handleContrarian}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activePreset === 'CONTRARIAN'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                : 'text-slate-300 hover:text-rose-300 hover:bg-slate-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Auto-fill the least picked team across all visible competitor cells."
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Contrarian</span>
            {activePreset === 'CONTRARIAN' && <Check className="w-3 h-3 text-rose-400" />}
          </button>

          {/* Mirror Rival Dropdown / Action */}
          <div className="relative">
            <button
              type="button"
              id="preset-mirror-rival-toggle"
              disabled={disabled || rivalList.length === 0}
              onClick={() => setShowRivalDropdown((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activePreset === 'MIRROR'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'text-slate-300 hover:text-purple-300 hover:bg-slate-800'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Clone picks from a specific competitor."
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Mirror Rival</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Rival Selection Popup Menu */}
            {showRivalDropdown && !disabled && rivalList.length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-scale-in">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  Select Rival to Clone
                </div>
                {rivalList.map((rival) => (
                  <button
                    key={rival.user_id}
                    type="button"
                    onClick={() => handleMirrorRival(rival.user_id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-purple-950/60 hover:text-purple-300 text-slate-200 truncate transition-colors flex items-center justify-between border border-transparent hover:border-purple-700/50"
                  >
                    <span className="truncate">{rival.displayName || rival.email}</span>
                    {selectedRivalId === rival.user_id && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clear Button */}
        <button
          type="button"
          id="preset-clear-all"
          disabled={disabled}
          onClick={handleClearAll}
          className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all flex items-center space-x-1 disabled:opacity-50"
          title="Clear all unlocked picks"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  );
};
