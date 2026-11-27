import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_STAFF_PIN } from '../config/env';
import {
  computeAuditEventHash,
  GENESIS_HASH,
  verifyAuditHashChain,
} from '../domain/auditHashChain';
import {
  AnonymousScanEvent,
  DEFAULT_VENUE_SETTINGS,
  ShiftBackupRecord,
  ShiftTally,
  StaffRole,
  VenueSettings,
  VerificationResult,
} from '../types/verification';

const TALLY_STORAGE_KEY = 'vetoid:anonymous_shift_tally_v2';
const BACKUPS_STORAGE_KEY = 'vetoid:eod_shift_backups_v1';
const SETTINGS_STORAGE_KEY = 'vetoid:venue_settings_v1';

function formatNzTimestamp(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function createEmptyShiftTally(
  staffRole: StaffRole = DEFAULT_VENUE_SETTINGS.defaultStaffRole
): ShiftTally {
  return {
    shiftStartedAt: new Date().toISOString(),
    staffRole,
    totalScanned: 0,
    pass18Plus: 0,
    under18: 0,
    expired: 0,
    invalidDoc: 0,
    manualFallback: 0,
    faceMismatchRefusals: 0,
    currentHeadcount: 0,
    peakHeadcount: 0,
    events: [],
  };
}

/**
 * Loads strictly anonymous aggregate shift counts & CCTV-sync timestamps (zero patron PII).
 */
export async function loadShiftTally(): Promise<ShiftTally> {
  try {
    const raw = await AsyncStorage.getItem(TALLY_STORAGE_KEY);
    if (!raw) return createEmptyShiftTally();
    const parsed = JSON.parse(raw);
    return {
      ...createEmptyShiftTally(),
      ...parsed,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return createEmptyShiftTally();
  }
}

export async function saveShiftTally(tally: ShiftTally): Promise<ShiftTally> {
  try {
    await AsyncStorage.setItem(TALLY_STORAGE_KEY, JSON.stringify(tally));
  } catch {
    // Non-fatal
  }
  return tally;
}

export async function updateShiftStaffRole(
  current: ShiftTally,
  staffRole: StaffRole
): Promise<ShiftTally> {
  return saveShiftTally({ ...current, staffRole });
}

export async function adjustHeadcount(
  current: ShiftTally,
  delta: number
): Promise<ShiftTally> {
  const nextCount = Math.max(0, (current.currentHeadcount ?? 0) + delta);
  const nextPeak = Math.max(current.peakHeadcount ?? 0, nextCount);
  return saveShiftTally({
    ...current,
    currentHeadcount: nextCount,
    peakHeadcount: nextPeak,
  });
}

export async function recordAnonymousVerdict(
  current: ShiftTally,
  result: VerificationResult,
  autoIncrementHeadcount: boolean = true
): Promise<ShiftTally> {
  const now = new Date();
  const prevHash =
    current.events.length > 0
      ? current.events[current.events.length - 1].eventHash ?? GENESIS_HASH
      : GENESIS_HASH;
  const baseEvent = {
    timestampIso: now.toISOString(),
    nzTime: formatNzTimestamp(now),
    verdict: result.verdict,
    docType: result.docType,
    staffRole: current.staffRole,
  };
  const event: AnonymousScanEvent = {
    ...baseEvent,
    prevHash,
    eventHash: computeAuditEventHash(prevHash, baseEvent),
  };
  const nextHeadcount =
    autoIncrementHeadcount && result.verdict === 'PASS_18_PLUS'
      ? (current.currentHeadcount ?? 0) + 1
      : current.currentHeadcount ?? 0;
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
    currentHeadcount: nextHeadcount,
    peakHeadcount: Math.max(current.peakHeadcount ?? 0, nextHeadcount),
    events: [...current.events.slice(-499), event],
  };
  return saveShiftTally(next);
}

export async function recordFaceMismatchRefusal(
  current: ShiftTally
): Promise<ShiftTally> {
  const now = new Date();
  const prevHash =
    current.events.length > 0
      ? current.events[current.events.length - 1].eventHash ?? GENESIS_HASH
      : GENESIS_HASH;
  const baseEvent = {
    timestampIso: now.toISOString(),
    nzTime: formatNzTimestamp(now),
    verdict: 'FACE_MISMATCH' as const,
    docType: 'VISUAL_FACE_CHECK' as const,
    staffRole: current.staffRole,
  };
  const event: AnonymousScanEvent = {
    ...baseEvent,
    prevHash,
    eventHash: computeAuditEventHash(prevHash, baseEvent),
  };
  const next: ShiftTally = {
    ...current,
    faceMismatchRefusals: current.faceMismatchRefusals + 1,
    events: [...current.events.slice(-499), event],
  };
  return saveShiftTally(next);
}

export async function resetShiftTally(
  staffRole: StaffRole = DEFAULT_VENUE_SETTINGS.defaultStaffRole
): Promise<ShiftTally> {
  const fresh = createEmptyShiftTally(staffRole);
  return saveShiftTally(fresh);
}

/**
 * Loads End-of-Day archived shift backups (max 60 recent shifts, strictly zero patron PII).
 */
export async function loadShiftBackups(): Promise<ShiftBackupRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(BACKUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Archives current shift into End-of-Day backup storage and starts a fresh shift.
 */
export async function archiveShiftEndOfDay(
  current: ShiftTally
): Promise<{ backup: ShiftBackupRecord; backups: ShiftBackupRecord[]; freshShift: ShiftTally }> {
  const nowIso = new Date().toISOString();
  const backup: ShiftBackupRecord = {
    ...current,
    id: `shift-${Date.now()}`,
    shiftEndedAt: nowIso,
    backedUpAt: nowIso,
  };
  const existing = await loadShiftBackups();
  const backups = [backup, ...existing].slice(0, 60);
  try {
    await AsyncStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(backups));
  } catch {
    // Non-fatal
  }
  const freshShift = await resetShiftTally(current.staffRole);
  return { backup, backups, freshShift };
}

/**
 * Generates a PII-free End-of-Day CSV audit & CCTV-sync log.
 */
export function buildShiftBackupCsv(record: ShiftBackupRecord): string {
  const chainCheck = verifyAuditHashChain(record.events);
  const lines: string[] = [
    '# VetoID End-of-Day Anonymous Shift Audit (NZ Privacy Act 2020 Compliant - Zero Patron PII)',
    `Shift Start (NZ),${formatNzTimestamp(new Date(record.shiftStartedAt))}`,
    `Shift End (NZ),${formatNzTimestamp(new Date(record.shiftEndedAt))}`,
    `Staff Role,${record.staffRole}`,
    `Audit Chain Integrity,${chainCheck.valid ? 'VERIFIED_INTACT_SHA256' : 'TAMPER_DETECTED'}`,
    `Peak Venue Headcount,${record.peakHeadcount ?? 0}`,
    `Total Scanned,${record.totalScanned}`,
    `Pass 18+,${record.pass18Plus}`,
    `Under 18,${record.under18}`,
    `Expired,${record.expired}`,
    `Invalid Doc,${record.invalidDoc}`,
    `Face Mismatch Refusals,${record.faceMismatchRefusals}`,
    '',
    'NZ_Timestamp,ISO_Timestamp,Staff_Role,Document_Category,Verdict,Event_Hash',
    ...record.events.map(
      (ev) =>
        `${ev.nzTime},${ev.timestampIso},${ev.staffRole},${ev.docType},${ev.verdict},${ev.eventHash ?? ''}`
    ),
  ];
  return lines.join('\n');
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
