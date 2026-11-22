export interface CalendarDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

const NZ_TIMEZONE = 'Pacific/Auckland';

/**
 * Returns today's calendar date in Pacific/Auckland time (SSAA 2012 legal reference).
 */
export function getNzToday(now: Date = new Date()): CalendarDate {
  const formatter = new Intl.DateTimeFormat('en-NZ', {
    timeZone: NZ_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

/**
 * Validates that a year/month/day forms a real Gregorian calendar date.
 */
export function isValidCalendarDate(date: CalendarDate): boolean {
  if (
    !Number.isInteger(date.year) ||
    !Number.isInteger(date.month) ||
    !Number.isInteger(date.day)
  ) {
    return false;
  }
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) {
    return false;
  }
  const check = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return (
    check.getUTCFullYear() === date.year &&
    check.getUTCMonth() === date.month - 1 &&
    check.getUTCDate() === date.day
  );
}

/**
 * Compares two calendar dates: -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/**
 * Computes exact whole years of age on referenceDate (handles Feb 29 birthdays cleanly).
 */
export function calculateAgeYears(
  dob: CalendarDate,
  referenceDate: CalendarDate
): number {
  let age = referenceDate.year - dob.year;
  const hadBirthdayThisYear =
    referenceDate.month > dob.month ||
    (referenceDate.month === dob.month && referenceDate.day >= dob.day);
  if (!hadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

/**
 * Computes days remaining until the patron turns `minimumAge` (returns 0 if already eligible).
 */
export function calculateDaysUntilAge(
  dob: CalendarDate,
  referenceDate: CalendarDate,
  minimumAge: number = 18
): number {
  const targetYear = dob.year + minimumAge;
  // For Feb 29 DOB in a non-leap target year, legal eligibility starts March 1.
  let targetMonth = dob.month;
  let targetDay = dob.day;
  if (targetMonth === 2 && targetDay === 29 && !isValidCalendarDate({ year: targetYear, month: 2, day: 29 })) {
    targetMonth = 3;
    targetDay = 1;
  }
  const targetUtc = Date.UTC(targetYear, targetMonth - 1, targetDay);
  const refUtc = Date.UTC(referenceDate.year, referenceDate.month - 1, referenceDate.day);
  const diffMs = targetUtc - refUtc;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86_400_000);
}

/**
 * Returns true if the document is expired under SSAA 2012 (expiryDate < today in Pacific/Auckland).
 */
export function isDocumentExpired(
  expiryDate: CalendarDate,
  referenceDate: CalendarDate
): boolean {
  return compareCalendarDates(expiryDate, referenceDate) < 0;
}

export function formatCalendarDateNz(date: CalendarDate): string {
  const dd = String(date.day).padStart(2, '0');
  const mm = String(date.month).padStart(2, '0');
  return `${dd}/${mm}/${date.year}`;
}

/**
 * Monotonic clock-drift guard to detect manual system clock tampering offline.
 */
export class ClockTamperGuard {
  private anchorWallMs: number;
  private anchorMonoMs: number;

  constructor(
    nowWallMs: number = Date.now(),
    nowMonoMs: number = typeof performance !== 'undefined' ? performance.now() : 0
  ) {
    this.anchorWallMs = nowWallMs;
    this.anchorMonoMs = nowMonoMs;
  }

  /**
   * Returns drift in seconds between wall clock and monotonic elapsed time.
   * Flags tampering if wall clock jumped > 120 seconds relative to monotonic uptime.
   */
  checkDrift(
    nowWallMs: number = Date.now(),
    nowMonoMs: number = typeof performance !== 'undefined' ? performance.now() : 0
  ): { isTampered: boolean; driftSeconds: number } {
    const wallDelta = nowWallMs - this.anchorWallMs;
    const monoDelta = nowMonoMs - this.anchorMonoMs;
    if (monoDelta < 0) {
      return { isTampered: false, driftSeconds: 0 };
    }
    const driftSeconds = Math.round(Math.abs(wallDelta - monoDelta) / 1000);
    return {
      isTampered: driftSeconds > 120,
      driftSeconds,
    };
  }
}
