import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useCelebrationSound() {
  const playSuccess = useCallback(async () => {
    try {
      // Use haptic feedback pattern as celebration feedback
      // This works offline and on all platforms
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Add a delayed second vibration for a "celebration" feel
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 200);
    } catch {
      // Silently fail on platforms without haptic support
    }
  }, []);

  return { playSuccess };
}
