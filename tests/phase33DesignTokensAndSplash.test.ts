import { describe, it, expect } from 'vitest';
import {
  DESIGN_TOKENS,
  HAPTIC_TAXONOMY,
  SPLASH_CONFIG
} from '../src/services/visualDesignService';

describe('M33.1 Visual Design Tokens, Haptic Taxonomy & Splash Ceiling', () => {
  it('enforces standardized design tokens for broadcast, danger, and glows', () => {
    expect(DESIGN_TOKENS.colors.broadcast.base).toBe('#0f172a');
    expect(DESIGN_TOKENS.colors.broadcast.surface).toBe('#1e293b');
    expect(DESIGN_TOKENS.colors.danger.DEFAULT).toBe('#e11d48');
    expect(DESIGN_TOKENS.colors.safe.DEFAULT).toBe('#10b981');
    expect(DESIGN_TOKENS.colors.active.DEFAULT).toBe('#06b6d4');

    expect(DESIGN_TOKENS.shadows.glowCyan).toContain('rgba(6, 182, 212, 0.4)');
    expect(DESIGN_TOKENS.shadows.glowRose).toContain('rgba(225, 29, 72, 0.5)');
    expect(DESIGN_TOKENS.shadows.glowEmerald).toContain('rgba(16, 185, 129, 0.3)');
  });

  it('enforces strict three-tier haptic taxonomy patterns', () => {
    expect(HAPTIC_TAXONOMY.light.durationMs).toEqual([15]);
    expect(HAPTIC_TAXONOMY.medium.durationMs).toEqual([45]);
    expect(HAPTIC_TAXONOMY.heavy.durationMs).toEqual([120, 60, 120]);
  });

  it('guarantees splash screen ceiling does not exceed 600ms non-blocking limit', () => {
    expect(SPLASH_CONFIG.MAX_HOLD_MS).toBeLessThanOrEqual(600);
    expect(SPLASH_CONFIG.TARGET_ANIMATION_MS).toBe(400);
  });
});
