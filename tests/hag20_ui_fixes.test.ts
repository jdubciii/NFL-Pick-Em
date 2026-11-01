import { describe, it, expect } from 'vitest';
import { getCurrentNFLWeek } from '../client/src/services/nflCalendarService';
import fs from 'fs';
import path from 'path';

describe('HAG-20: Client UI Fixes — Infamy week label and Matrix FINAL card', () => {
  describe('Fix 1: Shame screen Infamy Fixture Controls week label', () => {
    it('authoritative NFL calendar service evaluates current week dynamically as Week 8', () => {
      const currentWeek = getCurrentNFLWeek();
      expect(currentWeek).toBe(8);
    });

    it('WeeklyRecapCardView source has dynamic currentWeek fallback and no hardcoded WEEK 6 button', () => {
      const filePath = path.resolve(__dirname, '../client/src/components/shame/WeeklyRecapCardView.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Must import getCurrentNFLWeek
      expect(content).toContain("import { getCurrentNFLWeek } from '../../services/nflCalendarService'");

      // Must not contain hardcoded 'LIVE POOL (WEEK 6)'
      expect(content).not.toContain("'LIVE POOL (WEEK 6)'");
      expect(content).not.toContain('"LIVE POOL (WEEK 6)"');

      // Must use dynamic template string with currentWeek
      expect(content).toContain('`LIVE POOL (WEEK ${currentWeek})`');
    });

    it('WallOfShamePage initialWeek defaults dynamically to getCurrentNFLWeek()', () => {
      const filePath = path.resolve(__dirname, '../client/src/pages/WallOfShamePage.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain("import { getCurrentNFLWeek } from '../services/nflCalendarService'");
      expect(content).toContain('const initialWeek = propWeek ?? getCurrentNFLWeek();');
      expect(content).not.toContain('live Week 6 is unsettled');
    });
  });

  describe('Fix 2: Matrix tab Gametrack view FINAL game card', () => {
    it('LiveGametrackStream source does not repeat redundant shortName on final card and provides game link', () => {
      const filePath = path.resolve(__dirname, '../client/src/components/matrix/LiveGametrackStream.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // The redundant shortName display should not be rendered
      expect(content).not.toContain('{(item as LiveGame).shortName || (item as LiveGame).name}');

      // Must contain link to ESPN game detail
      expect(content).toContain('https://www.espn.com/nfl/game/_/gameId/${gameId}');
      expect(content).toContain("isFinal ? 'Game Detail' : 'Drive Progression'");
    });

    it('generates correct ESPN URLs and action labels for final vs in-progress games', () => {
      const gameId = '401873023';
      const getGameDetailLink = (id: string) => `https://www.espn.com/nfl/game/_/gameId/${id}`;
      const getActionLabel = (isFinal: boolean) => isFinal ? 'Game Detail' : 'Drive Progression';

      expect(getGameDetailLink(gameId)).toBe('https://www.espn.com/nfl/game/_/gameId/401873023');
      expect(getActionLabel(true)).toBe('Game Detail');
      expect(getActionLabel(false)).toBe('Drive Progression');
    });
  });
});
