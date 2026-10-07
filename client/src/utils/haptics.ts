export const triggerHaptic = async (type: 'impactHeavy' | 'impactMedium' | 'impactLight' | 'selection' = 'selection') => {
  try {
    const w = window as any;
    if (w.Capacitor && w.Capacitor.isPluginAvailable('Haptics')) {
      const { Haptics, ImpactStyle } = w.Capacitor.Plugins;
      if (type === 'impactHeavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (type === 'impactMedium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (type === 'impactLight') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else {
        await Haptics.selectionChanged();
      }
    } else if (navigator.vibrate) {
      if (type === 'impactHeavy') navigator.vibrate(40);
      else if (type === 'impactMedium') navigator.vibrate(25);
      else navigator.vibrate(10);
    }
  } catch {
    // Graceful no-op on platforms without haptic engines
  }
};
