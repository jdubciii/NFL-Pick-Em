import { Prisma } from '@prisma/client';

export interface DynamicSpreadAdjustment {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  baseSpread: string;        // Prisma.Decimal string (e.g. '-3.5')
  adjustedSpread: string;    // Prisma.Decimal string (e.g. '-4.5')
  totalPicksCount: number;
  homePicksRatio: string;    // Prisma.Decimal string (e.g. '0.8000')
  awayPicksRatio: string;    // Prisma.Decimal string (e.g. '0.2000')
  lineShift: string;         // Prisma.Decimal string (e.g. '-1.0')
  isLocked: boolean;
}

export class DynamicSpreadService {
  // Pure derivation of dynamic spread based on pick consensus skew (Decisions #3, #22, #54, #65)
  static calculateDynamicSpread(
    gameId: string,
    homeTeam: string,
    awayTeam: string,
    baseSpread: string,
    picks: { selectedTeam: string }[],
    isGameLocked: boolean = false
  ): DynamicSpreadAdjustment {
    const base = new Prisma.Decimal(baseSpread);

    if (isGameLocked) {
      return {
        gameId,
        homeTeam,
        awayTeam,
        baseSpread: base.toFixed(1),
        adjustedSpread: base.toFixed(1),
        totalPicksCount: picks.length,
        homePicksRatio: '0.0000',
        awayPicksRatio: '0.0000',
        lineShift: '0.0',
        isLocked: true
      };
    }

    const totalPicks = picks.length;
    if (totalPicks === 0) {
      return {
        gameId,
        homeTeam,
        awayTeam,
        baseSpread: base.toFixed(1),
        adjustedSpread: base.toFixed(1),
        totalPicksCount: 0,
        homePicksRatio: '0.0000',
        awayPicksRatio: '0.0000',
        lineShift: '0.0',
        isLocked: false
      };
    }

    const homePicksCount = picks.filter(p => p.selectedTeam === homeTeam).length;
    const awayPicksCount = picks.filter(p => p.selectedTeam === awayTeam).length;

    const totalDec = new Prisma.Decimal(totalPicks);
    const homeRatio = new Prisma.Decimal(homePicksCount).div(totalDec);
    const awayRatio = new Prisma.Decimal(awayPicksCount).div(totalDec);

    let lineShift = new Prisma.Decimal(0);

    // Skew rules: >= 70% shifts spread by 1.0; >= 60% shifts spread by 0.5
    if (homeRatio.gte('0.7000')) {
      lineShift = new Prisma.Decimal('-1.0');
    } else if (homeRatio.gte('0.6000')) {
      lineShift = new Prisma.Decimal('-0.5');
    } else if (awayRatio.gte('0.7000')) {
      lineShift = new Prisma.Decimal('1.0');
    } else if (awayRatio.gte('0.6000')) {
      lineShift = new Prisma.Decimal('0.5');
    }

    const adjustedSpread = base.add(lineShift);

    return {
      gameId,
      homeTeam,
      awayTeam,
      baseSpread: base.toFixed(1),
      adjustedSpread: adjustedSpread.toFixed(1),
      totalPicksCount: totalPicks,
      homePicksRatio: homeRatio.toFixed(4),
      awayPicksRatio: awayRatio.toFixed(4),
      lineShift: lineShift.toFixed(1),
      isLocked: false
    };
  }
}
