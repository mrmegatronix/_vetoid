import { ENV_STAFF_PIN } from '../config/env';

export type AcceptedDocType =
  | 'NZ_DRIVER_LICENCE'
  | 'PASSPORT'
  | 'KIWI_ACCESS'
  | 'LEGACY_HNZ_18_PLUS'
  | 'MANUAL_DOB';

export type RejectedDocType =
  | 'OVERSEAS_DRIVER_LICENCE'
  | 'STUDENT_ID'
  | 'TEMP_PAPER_LICENCE'
  | 'PHONE_SCREENSHOT'
  | 'UNSUPPORTED_DOC';

export type DocumentCategory = AcceptedDocType | RejectedDocType;

export type VerdictStatus =
  | 'PASS_18_PLUS'
  | 'UNDER_18'
  | 'EXPIRED'
  | 'INVALID_DOC';

/**
 * Strictly PII-free verification result.
 * Never holds patron name, address, licence number, passport number, or raw MRZ.
 */
export interface VerificationResult {
  verdict: VerdictStatus;
  docType: DocumentCategory;
  docLabel: string;
  ageYears: number | null;
  daysUntil18: number | null;
  isUnder25: boolean;
  expiryDateDisplay: string | null;
  dobDisplay: string | null;
  reasonTitle: string;
  patronLegalNotice: string;
  tactileCue: string;
  mrzChecksumValid?: boolean;
  evaluatedAtIso: string;
}

export interface ShiftTally {
  shiftStartedAt: string;
  totalScanned: number;
  pass18Plus: number;
  under18: number;
  expired: number;
  invalidDoc: number;
  manualFallback: number;
  faceMismatchRefusals: number;
}

export interface VenueSettings {
  staffPin: string;
  autoResetSeconds: number;
  showUnder25Cue: boolean;
  requireFaceConfirm: boolean;
  leftHandedMode: boolean;
  keepUnlockedStandby: boolean;
  minimumAge: number;
}

export const DEFAULT_VENUE_SETTINGS: VenueSettings = {
  staffPin: ENV_STAFF_PIN,
  autoResetSeconds: 3,
  showUnder25Cue: true,
  requireFaceConfirm: false,
  leftHandedMode: false,
  keepUnlockedStandby: true,
  minimumAge: 18,
};
