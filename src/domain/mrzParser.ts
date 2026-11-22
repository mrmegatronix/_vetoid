import { CalendarDate, getNzToday, isValidCalendarDate } from './nzDateTime';

export interface ParsedMrzResult {
  valid: boolean;
  checksumValid: boolean;
  dob: CalendarDate | null;
  expiryDate: CalendarDate | null;
  issuingCountry: string | null;
  error?: string;
}

const MRZ_WEIGHTS = [7, 3, 1];

/**
 * Computes ICAO 9303 Mod-10 check digit using 7-3-1 weighting.
 */
export function computeMrzCheckDigit(field: string): number {
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    const ch = field[i];
    let val = 0;
    if (ch >= '0' && ch <= '9') {
      val = ch.charCodeAt(0) - 48;
    } else if (ch >= 'A' && ch <= 'Z') {
      val = ch.charCodeAt(0) - 55; // A=10 .. Z=35
    } else if (ch === '<') {
      val = 0;
    } else {
      return -1;
    }
    sum += val * MRZ_WEIGHTS[i % 3];
  }
  return sum % 10;
}

function parseMrzYyMmDd(
  yymmdd: string,
  kind: 'dob' | 'expiry',
  today: CalendarDate
): CalendarDate | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));

  const currentCentury = Math.floor(today.year / 100) * 100;
  const currentTwoDigit = today.year % 100;

  let year: number;
  if (kind === 'dob') {
    // DOB cannot be in the future; map YY > currentYY to previous century (1900s).
    year = yy > currentTwoDigit ? currentCentury - 100 + yy : currentCentury + yy;
  } else {
    // Expiry dates can be up to ~15 years in the future or decades in the past.
    year = yy <= currentTwoDigit + 20 ? currentCentury + yy : currentCentury - 100 + yy;
  }

  const candidate: CalendarDate = { year, month, day };
  return isValidCalendarDate(candidate) ? candidate : null;
}

/**
 * Parses an ICAO 9303 TD3 Passport MRZ (2 lines x 44 chars).
 * Strictly discards holder name and passport number before returning.
 */
export function parseTd3PassportMrz(
  rawText: string,
  today: CalendarDate = getNzToday()
): ParsedMrzResult {
  const lines = rawText
    .toUpperCase()
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ''))
    .filter((l) => l.length >= 40 && l.includes('<'));

  // Locate a pair of TD3 lines (line1 starts with P, line2 has 44 chars)
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i];
    const l2 = lines[i + 1];
    if (l1.startsWith('P') && l1.length === 44 && l2.length === 44) {
      return evaluateTd3Line2(l1, l2, today);
    }
  }

  // Fallback: single line-2 capture (44 chars with expected numeric DOB & expiry regions)
  const loneLine2 = lines.find((l) => l.length === 44 && /^\S{9}\d[A-Z<]{3}\d{7}[MFX<]\d{7}/.test(l));
  if (loneLine2) {
    return evaluateTd3Line2('', loneLine2, today);
  }

  return {
    valid: false,
    checksumValid: false,
    dob: null,
    expiryDate: null,
    issuingCountry: null,
    error: 'No valid 2-line TD3 Passport MRZ detected.',
  };
}

function evaluateTd3Line2(
  line1: string,
  line2: string,
  today: CalendarDate
): ParsedMrzResult {
  const docNumField = line2.slice(0, 9);
  const docNumCheck = Number(line2[9]);
  const dobField = line2.slice(13, 19);
  const dobCheck = Number(line2[19]);
  const expField = line2.slice(21, 27);
  const expCheck = Number(line2[27]);
  const optField = line2.slice(28, 42);
  const optCheckChar = line2[42];
  const compositeCheck = Number(line2[43]);

  const docNumOk = computeMrzCheckDigit(docNumField) === docNumCheck;
  const dobOk = computeMrzCheckDigit(dobField) === dobCheck;
  const expOk = computeMrzCheckDigit(expField) === expCheck;
  const optOk =
    optCheckChar === '<' || computeMrzCheckDigit(optField) === Number(optCheckChar);
  const compositeInput = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
  const compositeOk = computeMrzCheckDigit(compositeInput) === compositeCheck;

  const checksumValid = docNumOk && dobOk && expOk && optOk && compositeOk;
  const dob = parseMrzYyMmDd(dobField, 'dob', today);
  const expiryDate = parseMrzYyMmDd(expField, 'expiry', today);
  const issuingCountry = line1.length >= 5 ? line1.slice(2, 5).replace(/</g, '') : null;

  return {
    valid: Boolean(dob && expiryDate),
    checksumValid,
    dob,
    expiryDate,
    issuingCountry,
    error: checksumValid ? undefined : 'MRZ check-digit mismatch (possible glare or tampering).',
  };
}
