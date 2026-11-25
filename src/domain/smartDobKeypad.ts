import { getNzToday } from './nzDateTime';

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Returns the set of valid next digits ('0'..'9') for a smart DDMMYYYY DOB keypad.
 * Enforces:
 * - Day 01..31
 * - Month 01..12 (compatible with entered day, e.g. day 31 excludes Feb/Apr/Jun/Sep/Nov)
 * - Year starts ONLY with 19.. or 20.. and cannot exceed current NZ year.
 */
export function getAllowedDobDigits(
  currentDigits: string,
  maxYear: number = getNzToday().year
): Set<string> {
  const allowed = new Set<string>();
  const pos = currentDigits.length;

  if (pos >= 8) return allowed;

  // Position 0: Day tens (0, 1, 2, 3)
  if (pos === 0) {
    ['0', '1', '2', '3'].forEach((d) => allowed.add(d));
    return allowed;
  }

  // Position 1: Day ones
  if (pos === 1) {
    const d1 = currentDigits[0];
    if (d1 === '0') {
      for (let i = 1; i <= 9; i++) allowed.add(String(i));
    } else if (d1 === '3') {
      allowed.add('0');
      allowed.add('1');
    } else {
      for (let i = 0; i <= 9; i++) allowed.add(String(i));
    }
    return allowed;
  }

  const day = Number(currentDigits.slice(0, 2));

  // Position 2: Month tens (only 0 or 1; verify at least one valid month in that decade fits `day`)
  if (pos === 2) {
    for (const m1 of ['0', '1']) {
      const startM = m1 === '0' ? 1 : 10;
      const endM = m1 === '0' ? 9 : 12;
      for (let m = startM; m <= endM; m++) {
        if (day <= DAYS_IN_MONTH[m]) {
          allowed.add(m1);
          break;
        }
      }
    }
    return allowed;
  }

  // Position 3: Month ones (month must be 01..12 and support `day`)
  if (pos === 3) {
    const m1 = currentDigits[2];
    const start = m1 === '0' ? 1 : 0;
    const end = m1 === '0' ? 9 : 2;
    for (let i = start; i <= end; i++) {
      const month = Number(`${m1}${i}`);
      if (month >= 1 && month <= 12 && day <= DAYS_IN_MONTH[month]) {
        allowed.add(String(i));
      }
    }
    return allowed;
  }

  // Position 4: Year thousands (only 1 or 2 -> 19xx or 20xx)
  if (pos === 4) {
    allowed.add('1');
    allowed.add('2');
    return allowed;
  }

  // Position 5: Year hundreds (1 -> 9 only, 2 -> 0 only)
  if (pos === 5) {
    const y1 = currentDigits[4];
    if (y1 === '1') allowed.add('9');
    if (y1 === '2') allowed.add('0');
    return allowed;
  }

  // Position 6: Year tens
  if (pos === 6) {
    const prefix = currentDigits.slice(4, 6); // '19' or '20'
    if (prefix === '19') {
      for (let i = 0; i <= 9; i++) allowed.add(String(i));
    } else {
      const maxTens = Math.floor((maxYear % 100) / 10);
      for (let i = 0; i <= maxTens; i++) allowed.add(String(i));
    }
    return allowed;
  }

  // Position 7: Year ones (cannot exceed maxYear; if Feb 29, must be leap year)
  if (pos === 7) {
    const month = Number(currentDigits.slice(2, 4));
    const yPrefix = Number(currentDigits.slice(4, 7)); // e.g. 202
    for (let i = 0; i <= 9; i++) {
      const year = yPrefix * 10 + i;
      if (year > maxYear) continue;
      if (day === 29 && month === 2) {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (!isLeap) continue;
      }
      allowed.add(String(i));
    }
    return allowed;
  }

  return allowed;
}

export function getDobStepLabel(currentDigits: string): string {
  const len = currentDigits.length;
  if (len < 2) return 'ENTER DAY (01–31)';
  if (len < 4) return 'ENTER MONTH (01–12)';
  if (len < 6) return 'ENTER YEAR (19.. OR 20..)';
  return 'COMPLETE BIRTH YEAR';
}
