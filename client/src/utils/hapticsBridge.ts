import { triggerHaptic as triggerHapticCore } from './haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'impactLight' | 'impactMedium' | 'impactHeavy' | 'selection';

export const triggerHaptic = async (type: HapticStyle = 'selection') => {
  if (type === 'light' || type === 'impactLight') {
    return triggerHapticCore('impactLight');
  }
  if (type === 'medium' || type === 'impactMedium') {
    return triggerHapticCore('impactMedium');
  }
  if (type === 'heavy' || type === 'impactHeavy') {
    return triggerHapticCore('impactHeavy');
  }
  return triggerHapticCore('selection');
};
