import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  formatCalendarDateNz,
  getNzToday,
  isDocumentExpired,
} from '../domain/nzDateTime';
import { parsePrintedNzDate } from '../domain/nzIdParser';
import { StaffRole } from '../types/verification';

const TRESPASS_STORAGE_KEY = 'vetoid:trespass_register_v1';

export interface TrespassRecord {
  id: string;
  displayName: string;
  idNumberRef: string; // Optional normalized NZDL/Passport ref (e.g. AB123456)
  dobDisplay: string; // Optional DD/MM/YYYY
  reason: string;
  issuedDateDisplay: string;
  expiresDateDisplay: string; // Default +2 years per NZ Trespass Act 1980
  issuedByRole: StaffRole;
}

export function getDefaultTrespassExpiryNz(): string {
  const today = getNzToday();
  return formatCalendarDateNz({
    year: today.year + 2,
    month: today.month,
    day: today.day,
  });
}

export function isTrespassRecordActive(record: TrespassRecord): boolean {
  const exp = parsePrintedNzDate(record.expiresDateDisplay);
  if (!exp) return true;
  return !isDocumentExpired(exp, getNzToday());
}

export async function loadTrespassRecords(): Promise<TrespassRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(TRESPASS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addTrespassRecord(
  existing: TrespassRecord[],
  input: {
    displayName: string;
    idNumberRef?: string;
    dobDisplay?: string;
    reason: string;
    expiresDateDisplay?: string;
    issuedByRole: StaffRole;
  }
): Promise<TrespassRecord[]> {
  const todayStr = formatCalendarDateNz(getNzToday());
  const nextRecord: TrespassRecord = {
    id: `tr-${Date.now()}`,
    displayName: input.displayName.trim(),
    idNumberRef: (input.idNumberRef ?? '').trim().toUpperCase().replace(/\s+/g, ''),
    dobDisplay: (input.dobDisplay ?? '').trim(),
    reason: input.reason.trim() || 'Trespass Notice Issued',
    issuedDateDisplay: todayStr,
    expiresDateDisplay:
      input.expiresDateDisplay?.trim() || getDefaultTrespassExpiryNz(),
    issuedByRole: input.issuedByRole,
  };
  const next = [nextRecord, ...existing];
  try {
    await AsyncStorage.setItem(TRESPASS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal
  }
  return next;
}

export async function removeTrespassRecord(
  existing: TrespassRecord[],
  id: string
): Promise<TrespassRecord[]> {
  const next = existing.filter((r) => r.id !== id);
  try {
    await AsyncStorage.setItem(TRESPASS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal
  }
  return next;
}

/**
 * Matches transient in-RAM OCR text & DOB against active unexpired Trespass Notices.
 */
export function matchTrespassNotice(
  rawOcrText: string,
  dobDisplay: string | null,
  records: TrespassRecord[]
): TrespassRecord | null {
  const upperCompact = rawOcrText.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const upperText = rawOcrText.toUpperCase();

  for (const record of records) {
    if (!isTrespassRecordActive(record)) continue;

    // 1. Direct normalized ID number match (e.g. NZDL AB123456 or Passport number)
    if (record.idNumberRef.length >= 6 && upperCompact.includes(record.idNumberRef)) {
      return record;
    }

    // 2. Name token + exact DOB match
    const nameTokens = record.displayName
      .toUpperCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (
      dobDisplay &&
      record.dobDisplay &&
      dobDisplay === record.dobDisplay &&
      nameTokens.length > 0 &&
      nameTokens.every((t) => upperText.includes(t))
    ) {
      return record;
    }
  }

  return null;
}
