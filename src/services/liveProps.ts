import { Prisma } from '@prisma/client';

export type PropType = 'OVER_UNDER' | 'BINARY';

export interface PropItem {
  propId: string;
  gameId: string;
  propType: PropType;
  description: string;
  targetLine: string;       // Prisma.Decimal string (e.g. '275.5' yards)
  pointValue: string;       // Prisma.Decimal string (e.g. '1.00')
  isLocked: boolean;
  status: 'OPEN' | 'GRADED' | 'VOID';
  actualValue?: string;     // Prisma.Decimal string once graded
  winningOutcome?: string;  // 'OVER', 'UNDER', 'YES', 'NO', 'PUSH'
}

export interface UserPropPick {
  propId: string;
  membershipId: string;
  selection: string;        // 'OVER', 'UNDER', 'YES', 'NO'
}

export interface GradedPropResult {
  propId: string;
  winningOutcome: string;
  pointsAwarded: string;     // Prisma.Decimal string
  isCorrect: boolean;
  rationale: string;
}

export class LivePropsService {
  // Create a prop entry prior to game or in-game sequence (Decisions #3, #22, #65)
  static createProp(
    gameId: string,
    propType: PropType,
    description: string,
    targetLine: string = '0.0',
    pointValue: string = '1.00',
    isLocked: boolean = false
  ): PropItem {
    if (isLocked) {
      throw new Error('Cannot create an already locked prop');
    }

    const line = new Prisma.Decimal(targetLine);
    const pts = new Prisma.Decimal(pointValue);

    if (pts.lte(0)) {
      throw new Error('Point value must be strictly greater than 0');
    }

    return {
      propId: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      gameId,
      propType,
      description,
      targetLine: line.toFixed(1),
      pointValue: pts.toFixed(2),
      isLocked: false,
      status: 'OPEN'
    };
  }

  // Register user selection ensuring per-prop lock authority (Decision #65)
  static submitPropPick(
    prop: PropItem,
    membershipId: string,
    selection: string
  ): UserPropPick {
    if (prop.isLocked || prop.status !== 'OPEN') {
      throw new Error('Prop is locked or closed for selections');
    }

    const validSelections =
      prop.propType === 'OVER_UNDER' ? ['OVER', 'UNDER'] : ['YES', 'NO'];

    if (!validSelections.includes(selection.toUpperCase())) {
      throw new Error(`Invalid selection: ${selection}. Allowed: ${validSelections.join(', ')}`);
    }

    return {
      propId: prop.propId,
      membershipId,
      selection: selection.toUpperCase()
    };
  }

  // Pure derivation of prop outcome and awarded points (Decisions #3, #22, #54)
  static gradeProp(
    prop: PropItem,
    actualValueStr: string,
    userPick?: UserPropPick
  ): GradedPropResult {
    const actual = new Prisma.Decimal(actualValueStr);
    const target = new Prisma.Decimal(prop.targetLine);
    const points = new Prisma.Decimal(prop.pointValue);

    let winningOutcome: string;

    if (prop.propType === 'OVER_UNDER') {
      if (actual.gt(target)) {
        winningOutcome = 'OVER';
      } else if (actual.lt(target)) {
        winningOutcome = 'UNDER';
      } else {
        winningOutcome = 'PUSH';
      }
    } else {
      winningOutcome = actual.gt(0) ? 'YES' : 'NO';
    }

    if (!userPick) {
      return {
        propId: prop.propId,
        winningOutcome,
        pointsAwarded: '0.00',
        isCorrect: false,
        rationale: `Outcome is ${winningOutcome}; no user pick provided`
      };
    }

    if (winningOutcome === 'PUSH') {
      return {
        propId: prop.propId,
        winningOutcome: 'PUSH',
        pointsAwarded: '0.00',
        isCorrect: false,
        rationale: 'Prop resulted in exact push; 0.00 points awarded'
      };
    }

    const isCorrect = userPick.selection === winningOutcome;

    return {
      propId: prop.propId,
      winningOutcome,
      pointsAwarded: isCorrect ? points.toFixed(2) : '0.00',
      isCorrect,
      rationale: isCorrect
        ? `Selection ${userPick.selection} matched winning outcome ${winningOutcome}`
        : `Selection ${userPick.selection} lost to ${winningOutcome}`
    };
  }
}
