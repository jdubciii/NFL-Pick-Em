export interface DesignTokenPalette {
  colors: {
    broadcast: {
      base: string;
      surface: string;
      elevated: string;
    };
    danger: {
      DEFAULT: string;
      pulse: string;
    };
    safe: {
      DEFAULT: string;
    };
    active: {
      DEFAULT: string;
    };
  };
  shadows: {
    glowCyan: string;
    glowRose: string;
    glowEmerald: string;
  };
  typography: {
    sans: string;
    mono: string;
  };
}

export const DESIGN_TOKENS: DesignTokenPalette = {
  colors: {
    broadcast: {
      base: '#0f172a',
      surface: '#1e293b',
      elevated: '#334155'
    },
    danger: {
      DEFAULT: '#e11d48',
      pulse: 'rgba(225, 29, 72, 0.2)'
    },
    safe: {
      DEFAULT: '#10b981'
    },
    active: {
      DEFAULT: '#06b6d4'
    }
  },
  shadows: {
    glowCyan: '0 0 15px rgba(6, 182, 212, 0.4)',
    glowRose: '0 0 15px rgba(225, 29, 72, 0.5)',
    glowEmerald: '0 0 15px rgba(16, 185, 129, 0.3)'
  },
  typography: {
    sans: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace'
  }
};

export type HapticTier = 'light' | 'medium' | 'heavy';

export interface HapticPattern {
  tier: HapticTier;
  durationMs: number[];
  usageDescription: string;
}

export const HAPTIC_TAXONOMY: Record<HapticTier, HapticPattern> = {
  light: {
    tier: 'light',
    durationMs: [15],
    usageDescription: 'Tab switching, swipe deck interactions, minor UI selection'
  },
  medium: {
    tier: 'medium',
    durationMs: [45],
    usageDescription: 'Locking a pick, casting a tribunal blind vote, toggling chaos FG/TD'
  },
  heavy: {
    tier: 'heavy',
    durationMs: [120, 60, 120],
    usageDescription: 'Target-locking rival, Executioner clock expiration, Contempt of court stamp'
  }
};

export const SPLASH_CONFIG = {
  MAX_HOLD_MS: 600,
  TARGET_ANIMATION_MS: 400
};

export function triggerHaptic(tier: HapticTier = 'light'): void {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    const pattern = HAPTIC_TAXONOMY[tier].durationMs;
    window.navigator.vibrate(pattern);
  }
}
