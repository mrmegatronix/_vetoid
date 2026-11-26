import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { VerdictStatus } from '../types/verification';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Distinct zero-look nightlife haptic signatures per verdict state.
 */
export async function triggerVerdictHaptics(verdict: VerdictStatus): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    switch (verdict) {
      case 'PASS_18_PLUS':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'UNDER_18':
        // Three rapid heavy pulses so door staff feel underage immediately in noisy venues
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await sleep(110);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await sleep(110);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'BANNED_TRESPASSED':
        // Four urgent heavy pulses for trespassed patron alert
        for (let i = 0; i < 4; i++) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await sleep(95);
        }
        break;
      case 'EXPIRED':
      case 'INVALID_DOC':
        // Two medium pulses prompting a quick visual glance
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await sleep(120);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
    }
  } catch {
    // Ignore on devices without haptic engines
  }
}
