import { Platform } from 'react-native';
import { VerdictStatus } from '../types/verification';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  durationSec: number,
  startOffsetSec: number = 0,
  type: OscillatorType = 'sine',
  gainPeak: number = 0.22
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playVerdictSound(verdict: VerdictStatus, enabled: boolean): void {
  if (!enabled) return;
  try {
    switch (verdict) {
      case 'PASS_18_PLUS':
        // Crisp ascending dual-tone pass chime (C6 -> E6)
        playTone(1046.5, 0.13, 0, 'triangle', 0.22);
        playTone(1318.5, 0.22, 0.1, 'triangle', 0.24);
        break;
      case 'UNDER_18':
        // Urgent triple low alarm buzz
        playTone(210, 0.14, 0, 'sawtooth', 0.24);
        playTone(210, 0.14, 0.18, 'sawtooth', 0.24);
        playTone(185, 0.24, 0.36, 'sawtooth', 0.28);
        break;
      case 'EXPIRED':
        // Descending amber warning double-beep
        playTone(520, 0.14, 0, 'square', 0.16);
        playTone(390, 0.22, 0.17, 'square', 0.18);
        break;
      case 'INVALID_DOC':
        // Distinct dissonant invalid-ID alert
        playTone(330, 0.16, 0, 'sawtooth', 0.18);
        playTone(245, 0.26, 0.15, 'sawtooth', 0.2);
        break;
    }
  } catch {
    // Non-fatal if browser blocks autoplay before gesture
  }
}

export function playKeyTapSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    playTone(760, 0.035, 0, 'sine', 0.09);
  } catch {
    // Ignore
  }
}

export function playScanShutterSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    playTone(1200, 0.04, 0, 'triangle', 0.14);
    playTone(880, 0.05, 0.04, 'sine', 0.12);
  } catch {
    // Ignore
  }
}

export function playUnlockSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    playTone(880, 0.09, 0, 'triangle', 0.18);
    playTone(1174.6, 0.16, 0.08, 'triangle', 0.2);
  } catch {
    // Ignore
  }
}

export function playErrorBeepSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    playTone(220, 0.18, 0, 'sawtooth', 0.18);
  } catch {
    // Ignore
  }
}
