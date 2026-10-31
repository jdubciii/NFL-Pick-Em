export interface SlateGameItem {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  favorite: string; // Team code of favorite
  isLocked: boolean; // Enforces Decision #65
}

export type PresetType =
  | 'FAVORITES'
  | 'UNDERDOGS'
  | 'HOME'
  | 'AWAY'
  | 'ALL_HOME'
  | 'ALL_AWAY'
  | 'CONTRARIAN'
  | 'MIRROR'
  | 'CLEAR'
  | 'CUSTOM';

export class QuickFillSafetyEngine {
  private previousSnapshot: Record<string, string> = {};
  private stagedPicks: Record<string, string> = {};
  private timer: any = null;
  private commitFn: ((picks: Record<string, string>) => void) | null = null;
  private isPending: boolean = false;

  applyPreset(
    games: SlateGameItem[],
    currentPicks: Record<string, string>,
    preset: PresetType | string,
    explicitPicks?: Record<string, string | null>
  ): { updatedPicks: Record<string, string>; affectedCount: number } {
    const updated = { ...currentPicks };
    let affectedCount = 0;

    for (const g of games) {
      if (g.isLocked) continue; // Decision #65 Guard: Never touch locked games

      let selection: string | null = '';
      if (explicitPicks && Object.prototype.hasOwnProperty.call(explicitPicks, g.gameId)) {
        selection = explicitPicks[g.gameId];
      } else {
        switch (preset) {
          case 'FAVORITES':
            selection = g.favorite;
            break;
          case 'UNDERDOGS':
            selection = g.favorite === g.homeTeam ? g.awayTeam : g.homeTeam;
            break;
          case 'HOME':
          case 'ALL_HOME':
            selection = g.homeTeam;
            break;
          case 'AWAY':
          case 'ALL_AWAY':
            selection = g.awayTeam;
            break;
        }
      }

      if (selection) {
        updated[g.gameId] = selection;
        affectedCount++;
      } else if (selection === null && Object.prototype.hasOwnProperty.call(updated, g.gameId)) {
        delete updated[g.gameId];
        affectedCount++;
      }
    }

    return { updatedPicks: updated, affectedCount };
  }

  stagePreset(
    games: SlateGameItem[],
    currentPicks: Record<string, string>,
    preset: PresetType | string,
    onCommit?: (picks: Record<string, string>) => void,
    explicitPicks?: Record<string, string | null>
  ): { updatedPicks: Record<string, string>; affectedCount: number } {
    if (this.timer) clearTimeout(this.timer);

    this.previousSnapshot = { ...currentPicks };
    const { updatedPicks, affectedCount } = this.applyPreset(games, currentPicks, preset, explicitPicks);
    this.stagedPicks = { ...updatedPicks };
    this.commitFn = onCommit || null;
    this.isPending = true;

    this.timer = setTimeout(() => {
      this.flushCommit();
    }, 7000);

    return { updatedPicks, affectedCount };
  }

  triggerUndo(): Record<string, string> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isPending = false;
    this.stagedPicks = { ...this.previousSnapshot };
    return { ...this.previousSnapshot };
  }

  flushCommit(): void {
    if (!this.isPending) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isPending = false;
    if (this.commitFn) {
      this.commitFn(this.stagedPicks);
    }
  }

  getActivePicks(): Record<string, string> {
    return this.stagedPicks;
  }

  isPendingCommit(): boolean {
    return this.isPending;
  }
}

export const quickFillSafetyEngine = new QuickFillSafetyEngine();
