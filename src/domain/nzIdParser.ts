import {
  CalendarDate,
  calculateAgeYears,
  calculateDaysUntilAge,
  formatCalendarDateNz,
  getNzToday,
  isDocumentExpired,
  isValidCalendarDate,
} from './nzDateTime';
import { computeMrzCheckDigit, parseTd3PassportMrz } from './mrzParser';
import {
  DocumentCategory,
  VerificationResult,
} from '../types/verification';

const PATRON_LEGAL_ALLOWED_IDS =
  'New Zealand law (Sale and Supply of Alcohol Act 2012) only accepts a current NZ Driver Licence, Kiwi Access / 18+ Card, current Passport, or accredited NZ Digital ID.';

const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  SEPT: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

/**
 * Parses common NZ printed date strings: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MM YYYY, or DD MMM YYYY.
 */
export function parsePrintedNzDate(raw: string): CalendarDate | null {
  const clean = raw.trim().toUpperCase();

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or DD MM YYYY
  const numeric = clean.match(/\b(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})\b/);
  if (numeric) {
    const candidate: CalendarDate = {
      day: Number(numeric[1]),
      month: Number(numeric[2]),
      year: Number(numeric[3]),
    };
    return isValidCalendarDate(candidate) ? candidate : null;
  }

  // DD MMM YYYY or DD-MMM-YYYY (e.g. 14 FEB 2002)
  const named = clean.match(/\b(\d{1,2})[\s\-]+([A-Z]{3,4})[\s\-]+(\d{4})\b/);
  if (named && MONTH_MAP[named[2]]) {
    const candidate: CalendarDate = {
      day: Number(named[1]),
      month: MONTH_MAP[named[2]],
      year: Number(named[3]),
    };
    return isValidCalendarDate(candidate) ? candidate : null;
  }

  return null;
}

/**
 * Extracts all valid calendar dates in text (fallback for noisy camera OCR on NZDL/Kiwi Access).
 */
function extractAllPrintedDates(text: string): CalendarDate[] {
  const found: CalendarDate[] = [];
  const regex =
    /\b(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{4}|\d{1,2}[\s\-]+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[\s\-]+\d{4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const parsed = parsePrintedNzDate(m[1]);
    if (parsed && parsed.year >= 1910 && parsed.year <= 2060) {
      found.push(parsed);
    }
  }
  return found;
}

function inferDobAndExpiryFromDates(
  dates: CalendarDate[],
  referenceDate: CalendarDate
): { dob: CalendarDate | null; expiry: CalendarDate | null } {
  if (dates.length === 0) return { dob: null, expiry: null };
  const sorted = [...dates].sort((a, b) =>
    a.year !== b.year
      ? a.year - b.year
      : a.month !== b.month
      ? a.month - b.month
      : a.day - b.day
  );
  // Earliest plausible birth date (at least 10 years ago)
  const dob =
    sorted.find((d) => d.year <= referenceDate.year - 10 && d.year >= 1910) ?? null;
  // Latest date at least 15 years after DOB is expiry
  const latest = sorted[sorted.length - 1];
  const expiry = dob && latest.year >= dob.year + 15 ? latest : null;
  return { dob, expiry };
}

function buildResult(params: {
  dob: CalendarDate;
  expiryDate: CalendarDate | null;
  docType: DocumentCategory;
  docLabel: string;
  tactileCue: string;
  mrzChecksumValid?: boolean;
  referenceDate: CalendarDate;
  minimumAge: number;
}): VerificationResult {
  const {
    dob,
    expiryDate,
    docType,
    docLabel,
    tactileCue,
    mrzChecksumValid,
    referenceDate,
    minimumAge,
  } = params;

  const evaluatedAtIso = new Date().toISOString();
  const dobDisplay = formatCalendarDateNz(dob);
  const expiryDateDisplay = expiryDate ? formatCalendarDateNz(expiryDate) : null;

  // Hard-fail expired documents under s 5(1) SSAA 2012
  if (expiryDate && isDocumentExpired(expiryDate, referenceDate)) {
    const ageYears = calculateAgeYears(dob, referenceDate);
    return {
      verdict: 'EXPIRED',
      docType,
      docLabel,
      ageYears,
      daysUntil18: calculateDaysUntilAge(dob, referenceDate, minimumAge),
      isUnder25: ageYears < 25,
      expiryDateDisplay,
      dobDisplay,
      reasonTitle: `ID EXPIRED (${expiryDateDisplay})`,
      patronLegalNotice:
        'Under New Zealand law, expired identification cannot be accepted as valid evidence of age for licensed premises.',
      tactileCue: 'Request a current, unexpired NZ-approved photo ID.',
      mrzChecksumValid,
      evaluatedAtIso,
    };
  }

  const ageYears = calculateAgeYears(dob, referenceDate);
  const daysUntil18 = calculateDaysUntilAge(dob, referenceDate, minimumAge);

  if (ageYears < minimumAge) {
    return {
      verdict: 'UNDER_18',
      docType,
      docLabel,
      ageYears,
      daysUntil18,
      isUnder25: true,
      expiryDateDisplay,
      dobDisplay,
      reasonTitle: `UNDER ${minimumAge} (${daysUntil18} DAYS TO GO)`,
      patronLegalNotice: `Entry is restricted to patrons aged ${minimumAge}+ under the Sale and Supply of Alcohol Act 2012.`,
      tactileCue: 'Refuse entry politely. Do not retain patron ID.',
      mrzChecksumValid,
      evaluatedAtIso,
    };
  }

  return {
    verdict: 'PASS_18_PLUS',
    docType,
    docLabel,
    ageYears,
    daysUntil18: 0,
    isUnder25: ageYears < 25,
    expiryDateDisplay,
    dobDisplay,
    reasonTitle: `${minimumAge}+ VERIFIED`,
    patronLegalNotice: 'Age verified. Zero personal details retained.',
    tactileCue,
    mrzChecksumValid,
    evaluatedAtIso,
  };
}

function buildInvalidDocResult(
  docType: DocumentCategory,
  docLabel: string,
  reasonTitle: string
): VerificationResult {
  return {
    verdict: 'INVALID_DOC',
    docType,
    docLabel,
    ageYears: null,
    daysUntil18: null,
    isUnder25: false,
    expiryDateDisplay: null,
    dobDisplay: null,
    reasonTitle,
    patronLegalNotice: PATRON_LEGAL_ALLOWED_IDS,
    tactileCue: 'Ask patron for NZ Driver Licence, Kiwi Access Card, or Passport.',
    evaluatedAtIso: new Date().toISOString(),
  };
}

/**
 * Evaluates raw OCR/MRZ text extracted in RAM on-device.
 * Never persists or returns patron PII (name, address, licence/passport number).
 */
export function evaluateScannedDocumentText(
  rawText: string,
  referenceDate: CalendarDate = getNzToday(),
  minimumAge: number = 18
): VerificationResult {
  const upper = rawText.toUpperCase();

  // 1. Explicit SSAA 2012 Hard Rejections
  if (/\bTEMPORARY\s+DRIVER\s+LICEN[CS]E\b/.test(upper)) {
    return buildInvalidDocResult(
      'TEMP_PAPER_LICENCE',
      'Temporary Paper Licence',
      'TEMPORARY LICENCE NOT ACCEPTED'
    );
  }

  if (
    /\b(SUPER\s*GOLD|COMMUNITY\s+SERVICES\s+CARD|FIREARMS\s+LICEN[CS]E)\b/.test(upper)
  ) {
    return buildInvalidDocResult(
      'UNSUPPORTED_DOC',
      'Non-Statutory NZ Card',
      'CARD TYPE NOT ACCEPTED IN NZ'
    );
  }

  if (/\b(STUDENT\s+ID|UNIVERSITY\s+OF|POLYTECHNIC|TERTIARY\s+ID)\b/.test(upper)) {
    return buildInvalidDocResult(
      'STUDENT_ID',
      'Student ID',
      'STUDENT ID NOT ACCEPTED IN NZ'
    );
  }

  // Overseas driver licence detection (AU states, UK DVLA, US/CA states)
  const looksLikeDriverLicence = /\bDRIVER(?:'S)?\s+LICEN[CS]E\b|\bDRIVING\s+LICENCE\b/.test(upper);
  const mentionsNewZealand = /\bNEW\s+ZEALAND\b|\bNZTA\b|\bWAKA\s+KOTAHI\b/.test(upper);
  const mentionsOverseasAuthority =
    /\b(NEW\s+SOUTH\s+WALES|VICTORIA|QUEENSLAND|WESTERN\s+AUSTRALIA|SOUTH\s+AUSTRALIA|TASMANIA|DVLA|UNITED\s+KINGDOM|CALIFORNIA|TEXAS|NEW\s+YORK|ONTARIO|BRITISH\s+COLUMBIA|AUSTRALIA)\b/.test(
      upper
    );

  if (looksLikeDriverLicence && (!mentionsNewZealand || mentionsOverseasAuthority)) {
    return buildInvalidDocResult(
      'OVERSEAS_DRIVER_LICENCE',
      'Overseas Driver Licence',
      'OVERSEAS LICENCE NOT ACCEPTED IN NZ'
    );
  }

  // 2. Passport TD3 MRZ (NZ or International — both accepted under SSAA 2012)
  const mrz = parseTd3PassportMrz(rawText, referenceDate);
  if (mrz.valid && mrz.dob && mrz.expiryDate) {
    if (!mrz.checksumValid) {
      return buildInvalidDocResult(
        'PASSPORT',
        'Passport (Checksum Failed)',
        'MRZ CHECKSUM MISMATCH — RE-SCAN'
      );
    }
    const label = mrz.issuingCountry
      ? `Passport (${mrz.issuingCountry})`
      : 'Passport (MRZ)';
    return buildResult({
      dob: mrz.dob,
      expiryDate: mrz.expiryDate,
      docType: 'PASSPORT',
      docLabel: label,
      tactileCue: 'Verify passport photo page lamination & likeness.',
      mrzChecksumValid: true,
      referenceDate,
      minimumAge,
    });
  }

  // 3. Kiwi Access Card / Legacy HNZ 18+ Card
  const isKiwiAccess = /\bKIWI\s+ACCESS\b/.test(upper);
  const isLegacy18Plus = /\b(HOSPITALITY\s+NZ|HANZ|18\+\s+CARD)\b/.test(upper);
  if (isKiwiAccess || isLegacy18Plus) {
    let dob = extractLabeledDate(upper, /(?:DOB|DATE\s+OF\s+BIRTH|BORN)[:\s]*([^\n]+)/);
    let expiry = extractLabeledDate(upper, /(?:EXP|EXPIRY|EXPIRES|VALID\s+UNTIL)[:\s]*([^\n]+)/);
    if (!dob) {
      const inferred = inferDobAndExpiryFromDates(extractAllPrintedDates(upper), referenceDate);
      dob = inferred.dob;
      expiry = expiry ?? inferred.expiry;
    }
    if (dob) {
      return buildResult({
        dob,
        expiryDate: expiry,
        docType: isKiwiAccess ? 'KIWI_ACCESS' : 'LEGACY_HNZ_18_PLUS',
        docLabel: isKiwiAccess ? 'Kiwi Access Card' : 'Legacy HNZ 18+ Card',
        tactileCue: 'Check silver fern hologram & raised tactile edge.',
        referenceDate,
        minimumAge,
      });
    }
  }

  // 4. Current New Zealand Driver Licence
  // Format check: NZDL licence number is 2 letters + 6 digits (e.g. DL123456), 3-digit version
  const hasNzdlNumber = /\b[A-Z]{2}\d{6}\b/.test(upper);
  if (mentionsNewZealand || hasNzdlNumber) {
    let dob = extractLabeledDate(
      upper,
      /(?:3\.?\s*DOB|DOB|DATE\s+OF\s+BIRTH)[:\s]*([^\n]+)/
    );
    let expiry = extractLabeledDate(
      upper,
      /(?:4B\.?\s*EXP|4B|EXPIRY|EXPIRES|EXP)[:\s]*([^\n]+)/
    );
    if (!dob) {
      const inferred = inferDobAndExpiryFromDates(extractAllPrintedDates(upper), referenceDate);
      dob = inferred.dob;
      expiry = expiry ?? inferred.expiry;
    }
    if (dob) {
      return buildResult({
        dob,
        expiryDate: expiry,
        docType: 'NZ_DRIVER_LICENCE',
        docLabel: 'NZ Driver Licence',
        tactileCue: 'Check NZDL raised hologram, laser-etched photo & card edge.',
        referenceDate,
        minimumAge,
      });
    }
  }

  return buildInvalidDocResult(
    'UNSUPPORTED_DOC',
    'Unrecognised Document',
    'UNRECOGNISED ID — USE MANUAL DOB OR RE-SCAN'
  );
}

function extractLabeledDate(text: string, regex: RegExp): CalendarDate | null {
  const match = text.match(regex);
  if (!match || !match[1]) return null;
  return parsePrintedNzDate(match[1]);
}

/**
 * Manual DOB fallback for scratched/glared cards or patrons declining electronic scanning (IPP 4).
 */
export function evaluateManualDob(
  day: number,
  month: number,
  year: number,
  referenceDate: CalendarDate = getNzToday(),
  minimumAge: number = 18
): VerificationResult | null {
  const dob: CalendarDate = { day, month, year };
  if (!isValidCalendarDate(dob)) return null;
  // Sanity bounds: no DOB in the future or older than 120 years
  if (year < referenceDate.year - 120 || year > referenceDate.year) return null;

  return buildResult({
    dob,
    expiryDate: null,
    docType: 'MANUAL_DOB',
    docLabel: 'Manual Visual Check',
    tactileCue: 'Confirm document is current (unexpired) & photo matches patron.',
    referenceDate,
    minimumAge,
  });
}

/**
 * Built-in practice drill / test fixtures (synthetic, zero real PII) for 30s staff onboarding.
 */
export interface PracticeCard {
  id: string;
  label: string;
  subtitle: string;
  rawOcrText: string;
}

function buildSyntheticMrz(dobYyMmDd: string, expYyMmDd: string): string {
  const docNum = 'LA123456<';
  const docCheck = computeMrzCheckDigit(docNum);
  const dobCheck = computeMrzCheckDigit(dobYyMmDd);
  const expCheck = computeMrzCheckDigit(expYyMmDd);
  const opt = '<<<<<<<<<<<<<<';
  const optCheck = computeMrzCheckDigit(opt);
  const composite = computeMrzCheckDigit(
    `${docNum}${docCheck}${dobYyMmDd}${dobCheck}${expYyMmDd}${expCheck}${opt}${optCheck}`
  );
  return [
    'P<NZLSAMPLE<<PATRON<<<<<<<<<<<<<<<<<<<<<<<<<',
    `${docNum}${docCheck}NZL${dobYyMmDd}${dobCheck}M${expYyMmDd}${expCheck}${opt}${optCheck}${composite}`,
  ].join('\n');
}

export const PRACTICE_DRILL_CARDS: PracticeCard[] = [
  {
    id: 'nzdl-pass',
    label: 'Valid NZ Driver Licence (24yo)',
    subtitle: 'Expected: PASS 18+ (with <25 badge)',
    rawOcrText: [
      'NEW ZEALAND DRIVER LICENCE',
      'NZTA WAKA KOTAHI',
      '5a. AB123456  5b. 123',
      '3. DOB: 15-06-2002',
      '4b. EXP: 15-06-2032',
    ].join('\n'),
  },
  {
    id: 'kiwi-under18',
    label: 'Kiwi Access Card (Under 18)',
    subtitle: 'Expected: UNDER 18 (Crimson Red)',
    rawOcrText: [
      'KIWI ACCESS CARD',
      'HOSPITALITY NEW ZEALAND',
      'DOB: 28/12/2008',
      'EXPIRY: 28/12/2035',
    ].join('\n'),
  },
  {
    id: 'passport-expired',
    label: 'Expired NZ Passport (MRZ)',
    subtitle: 'Expected: EXPIRED (Amber Hard-Fail)',
    rawOcrText: buildSyntheticMrz('980512', '240512'),
  },
  {
    id: 'overseas-dl',
    label: 'Australian Driver Licence (NSW)',
    subtitle: 'Expected: INVALID DOC (Violet)',
    rawOcrText: [
      'NEW SOUTH WALES AUSTRALIA',
      'DRIVER LICENCE',
      'DOB: 10/03/1995',
      'EXPIRY: 10/03/2030',
    ].join('\n'),
  },
];
