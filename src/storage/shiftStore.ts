import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_STAFF_PIN } from '../config/env';
import {
  DEFAULT_VENUE_SETTINGS,
  ShiftTally,
  VenueSettings,
  VerificationResult,
} from '../types/verification';

const TALLY_STORAGE_KEY = 'vetoid:anonymous_shift_tally_v1';
const SETTINGS_STORAGE_KEY = 'vetoid:venue_settings_v1';

export function createEmptyShiftTally(): ShiftTally {
  return {
    shiftStartedAt: new Date().toISOString(),
    totalScanned: 0,
    pass18Plus: 0,
    under18: 0,
    expired: 0,
    invalidDoc: 0,
    manualFallback: 0,
    faceMismatchRefusals: 0,
  };
}

/**
 * Loads strictly anonymous aggregate shift counts (zero patron PII).
 */
export async function loadShiftTally(): Promise<ShiftTally> {
  try {
    const raw = await AsyncStorage.getItem(TALLY_STORAGE_KEY);
    if (!raw) return createEmptyShiftTally();
    return { ...createEmptyShiftTally(), ...JSON.parse(raw) };
  } catch {
    return createEmptyShiftTally();
  }
}

export async function recordAnonymousVerdict(
  current: ShiftTally,
  result: VerificationResult
): Promise<ShiftTally> {
  const next: ShiftTally = {
    ...current,
    totalScanned: current.totalScanned + 1,
    pass18Plus:
      current.pass18Plus + (result.verdict === 'PASS_18_PLUS' ? 1 : 0),
    under18: current.under18 + (result.verdict === 'UNDER_18' ? 1 : 0),
    expired: current.expired + (result.verdict === 'EXPIRED' ? 1 : 0),
    invalidDoc:
      current.invalidDoc + (result.verdict === 'INVALID_DOC' ? 1 : 0),
    manualFallback:
      current.manualFallback + (result.docType === 'MANUAL_DOB' ? 1 : 0),
  };
  try {
    await AsyncStorage.setItem(TALLY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: scanner must continue operating offline even if storage fails
  }
  return next;
}

export async function recordFaceMismatchRefusal(
  current: ShiftTally
): Promise<ShiftTally> {
  const next: ShiftTally = {
    ...current,
    faceMismatchRefusals: current.faceMismatchRefusals + 1,
  };
  try {
    await AsyncStorage.setItem(TALLY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal
  }
  return next;
}

export async function resetShiftTally(): Promise<ShiftTally> {
  const fresh = createEmptyShiftTally();
  try {
    await AsyncStorage.setItem(TALLY_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Non-fatal
  }
  return fresh;
}

export async function loadVenueSettings(): Promise<VenueSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VENUE_SETTINGS, staffPin: ENV_STAFF_PIN };
    return {
      ...DEFAULT_VENUE_SETTINGS,
      ...JSON.parse(raw),
      staffPin: ENV_STAFF_PIN,
    };
  } catch {
    return { ...DEFAULT_VENUE_SETTINGS, staffPin: ENV_STAFF_PIN };
  }
}

export async function saveVenueSettings(
  settings: VenueSettings
): Promise<VenueSettings> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Non-fatal
  }
  return settings;
}
