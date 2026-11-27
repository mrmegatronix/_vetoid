import { ENV_STAFF_PIN } from '../config/env';

export type AcceptedDocType =
  | 'NZ_DRIVER_LICENCE'
  | 'PASSPORT'
  | 'KIWI_ACCESS'
  | 'LEGACY_HNZ_18_PLUS'
  | 'NZ_DIGITAL_ID'
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
  | 'INVALID_DOC'
  | 'BANNED_TRESPASSED';

export type StaffRole =
  | 'Duty Manager'
  | 'Waiter'
  | 'Bartender'
  | 'Security Staff';

export const STAFF_ROLES: StaffRole[] = [
  'Duty Manager',
  'Security Staff',
  'Bartender',
  'Waiter',
];

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

/**
 * Strictly anonymous timestamped scan record for CCTV correlation & DLC audits.
 * Contains ZERO patron PII.
 */
export interface AnonymousScanEvent {
  timestampIso: string;
  nzTime: string;
  verdict: VerdictStatus | 'FACE_MISMATCH';
  docType: DocumentCategory | 'VISUAL_FACE_CHECK';
  staffRole: StaffRole;
  prevHash?: string;
  eventHash?: string;
}

export interface ShiftTally {
  shiftStartedAt: string;
  shiftEndedAt?: string;
  staffRole: StaffRole;
  totalScanned: number;
  pass18Plus: number;
  under18: number;
  expired: number;
  invalidDoc: number;
  manualFallback: number;
  faceMismatchRefusals: number;
  currentHeadcount: number;
  peakHeadcount: number;
  events: AnonymousScanEvent[];
}

export interface ShiftBackupRecord extends ShiftTally {
  id: string;
  backedUpAt: string;
  shiftEndedAt: string;
}

export interface VenueSettings {
  staffPin: string;
  autoResetSeconds: number; // 0 = hold until manual tap
  showUnder25Cue: boolean;
  requireFaceConfirm: boolean;
  leftHandedMode: boolean;
  keepUnlockedStandby: boolean;
  soundEffectsEnabled: boolean;
  defaultStaffRole: StaffRole;
  minimumAge: number; // 18 | 20 | 25
  venueCapacity: number;
  autoIncrementHeadcount: boolean;
}

export const DEFAULT_VENUE_SETTINGS: VenueSettings = {
  staffPin: ENV_STAFF_PIN,
  autoResetSeconds: 8,
  showUnder25Cue: true,
  requireFaceConfirm: false,
  leftHandedMode: false,
  keepUnlockedStandby: true,
  soundEffectsEnabled: true,
  defaultStaffRole: 'Security Staff',
  minimumAge: 18,
  venueCapacity: 150,
  autoIncrementHeadcount: true,
};
