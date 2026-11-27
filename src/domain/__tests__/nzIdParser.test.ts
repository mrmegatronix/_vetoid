import { describe, expect, it } from 'vitest';
import {
  calculateAgeYears,
  calculateDaysUntilAge,
  ClockTamperGuard,
} from '../nzDateTime';
import { computeMrzCheckDigit, parseTd3PassportMrz } from '../mrzParser';
import {
  evaluateManualDob,
  evaluateScannedDocumentText,
  PRACTICE_DRILL_CARDS,
} from '../nzIdParser';
import { getAllowedDobDigits } from '../smartDobKeypad';
import {
  buildSampleFreshDistfQr,
  verifyDistfDigitalId,
} from '../digitalIdVerifier';
import {
  computeAuditEventHash,
  GENESIS_HASH,
  verifyAuditHashChain,
} from '../auditHashChain';
import { buildIcao9303BacInput } from '../epassportNfc';

const REF_DATE = { year: 2026, month: 11, day: 23 };

function buildValidTd3Mrz(dobYyMmDd: string, expYyMmDd: string, country = 'NZL'): string {
  const docNum = 'LA123456<';
  const docCheck = computeMrzCheckDigit(docNum);
  const dobCheck = computeMrzCheckDigit(dobYyMmDd);
  const expCheck = computeMrzCheckDigit(expYyMmDd);
  const opt = '<<<<<<<<<<<<<<';
  const optCheck = computeMrzCheckDigit(opt);
  const line2Prefix = `${docNum}${docCheck}${country}${dobYyMmDd}${dobCheck}M${expYyMmDd}${expCheck}${opt}${optCheck}`;
  const compositeInput = `${docNum}${docCheck}${dobYyMmDd}${dobCheck}${expYyMmDd}${expCheck}${opt}${optCheck}`;
  const compositeCheck = computeMrzCheckDigit(compositeInput);
  const line1 = `P<${country}DOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44).padEnd(44, '<');
  const line2 = `${line2Prefix}${compositeCheck}`;
  return `${line1}\n${line2}`;
}

describe('NZ DateTime & Age Math', () => {
  it('handles exact 18th birthday boundary', () => {
    expect(calculateAgeYears({ year: 2008, month: 11, day: 23 }, REF_DATE)).toBe(18);
    expect(calculateAgeYears({ year: 2008, month: 11, day: 24 }, REF_DATE)).toBe(17);
    expect(calculateDaysUntilAge({ year: 2008, month: 11, day: 24 }, REF_DATE, 18)).toBe(1);
  });

  it('handles Feb 29 leap-year birthdays safely', () => {
    expect(
      calculateAgeYears({ year: 2008, month: 2, day: 29 }, { year: 2026, month: 2, day: 28 })
    ).toBe(17);
    expect(
      calculateAgeYears({ year: 2008, month: 2, day: 29 }, { year: 2026, month: 3, day: 1 })
    ).toBe(18);
  });

  it('flags manual device clock jump via ClockTamperGuard', () => {
    const guard = new ClockTamperGuard(1_000_000, 1_000);
    expect(guard.checkDrift(1_010_000, 11_000).isTampered).toBe(false);
    // Wall clock jumped ahead by 1 year while monotonic only moved 10s
    expect(guard.checkDrift(1_010_000 + 31_536_000_000, 11_000).isTampered).toBe(true);
  });
});

describe('ICAO 9303 Passport MRZ Parser', () => {
  it('verifies valid NZ passport MRZ and strips PII', () => {
    const mrzText = buildValidTd3Mrz('010515', '310515', 'NZL');
    const parsed = parseTd3PassportMrz(mrzText, REF_DATE);
    expect(parsed.valid).toBe(true);
    expect(parsed.checksumValid).toBe(true);
    expect(parsed.dob).toEqual({ year: 2001, month: 5, day: 15 });
    expect(parsed.expiryDate).toEqual({ year: 2031, month: 5, day: 15 });
    expect(JSON.stringify(parsed)).not.toContain('DOE');
    expect(JSON.stringify(parsed)).not.toContain('LA123456');
  });

  it('rejects tampered MRZ check digit', () => {
    const valid = buildValidTd3Mrz('010515', '310515', 'NZL');
    const tampered = valid.replace('010515', '000515');
    const result = evaluateScannedDocumentText(tampered, REF_DATE);
    expect(result.verdict).toBe('INVALID_DOC');
  });
});

describe('SSAA 2012 NZ ID Verification Rules', () => {
  it('approves current 18+ NZ Driver Licence and flags <25 cue', () => {
    const res = evaluateScannedDocumentText(PRACTICE_DRILL_CARDS[0].rawOcrText, REF_DATE);
    expect(res.verdict).toBe('PASS_18_PLUS');
    expect(res.docType).toBe('NZ_DRIVER_LICENCE');
    expect(res.ageYears).toBe(24);
    expect(res.isUnder25).toBe(true);
  });

  it('rejects Under-18 Kiwi Access Card with days-until-18', () => {
    const res = evaluateScannedDocumentText(PRACTICE_DRILL_CARDS[1].rawOcrText, REF_DATE);
    expect(res.verdict).toBe('UNDER_18');
    expect(res.docType).toBe('KIWI_ACCESS');
    expect(res.daysUntil18).toBeGreaterThan(0);
  });

  it('hard-fails expired passports even when holder is over 18', () => {
    const expiredMrz = buildValidTd3Mrz('980512', '240512', 'NZL');
    const res = evaluateScannedDocumentText(expiredMrz, REF_DATE);
    expect(res.verdict).toBe('EXPIRED');
    expect(res.ageYears).toBe(28);

    const practiceExpired = evaluateScannedDocumentText(
      PRACTICE_DRILL_CARDS[2].rawOcrText,
      REF_DATE
    );
    expect(practiceExpired.verdict).toBe('EXPIRED');
  });

  it('hard-rejects overseas driver licences per SSAA 2012', () => {
    const res = evaluateScannedDocumentText(PRACTICE_DRILL_CARDS[3].rawOcrText, REF_DATE);
    expect(res.verdict).toBe('INVALID_DOC');
    expect(res.docType).toBe('OVERSEAS_DRIVER_LICENCE');
  });

  it('hard-rejects student IDs and temporary paper licences', () => {
    expect(
      evaluateScannedDocumentText('UNIVERSITY OF AUCKLAND STUDENT ID DOB: 01/01/2000', REF_DATE)
        .verdict
    ).toBe('INVALID_DOC');
    expect(
      evaluateScannedDocumentText('NEW ZEALAND TEMPORARY DRIVER LICENCE DOB: 01/01/2000', REF_DATE)
        .verdict
    ).toBe('INVALID_DOC');
  });

  it('supports IPP 4 manual DOB fallback', () => {
    const pass = evaluateManualDob(10, 5, 2000, REF_DATE);
    expect(pass?.verdict).toBe('PASS_18_PLUS');
    const fail = evaluateManualDob(10, 5, 2010, REF_DATE);
    expect(fail?.verdict).toBe('UNDER_18');
  });
});

describe('Smart DOB Keypad Constraints', () => {
  it('restricts day tens to 0-3 and prevents month > 12', () => {
    expect([...getAllowedDobDigits('', 2026)]).toEqual(['0', '1', '2', '3']);
    // After day 15, month tens only 0 or 1
    expect([...getAllowedDobDigits('15', 2026)]).toEqual(['0', '1']);
    // After day 15 and month tens '1', only 0, 1, 2 allowed (10, 11, 12)
    expect([...getAllowedDobDigits('151', 2026)]).toEqual(['0', '1', '2']);
  });

  it('restricts year start to 19.. or 20.. and blocks impossible day 31 months', () => {
    // Day 31 with month tens '0' excludes Feb(02), Apr(04), Jun(06), Sep(09)
    expect([...getAllowedDobDigits('310', 2026)]).toEqual(['1', '3', '5', '7', '8']);
    // Year position 4 only allows 1 or 2
    expect([...getAllowedDobDigits('1506', 2026)]).toEqual(['1', '2']);
    expect([...getAllowedDobDigits('15061', 2026)]).toEqual(['9']);
    expect([...getAllowedDobDigits('15062', 2026)]).toEqual(['0']);
  });
});

describe('Phase 2: DISTF Digital ID, Audit Hash Chain & ePassport BAC', () => {
  it('verifies fresh accredited NZ DISTF Digital ID and enforces R25 policy', () => {
    const now = 1_795_000_000;
    const qr = buildSampleFreshDistfQr(now);
    const pass18 = verifyDistfDigitalId(qr, REF_DATE, 18, now);
    expect(pass18?.verdict).toBe('PASS_18_PLUS');
    const fail25 = verifyDistfDigitalId(qr, REF_DATE, 25, now);
    expect(fail25?.verdict).toBe('UNDER_18');
  });

  it('rejects stale/replayed Digital ID QR screenshots (>120s old) and unaccredited issuers', () => {
    const now = 1_795_000_000;
    const staleQr = buildSampleFreshDistfQr(now - 300);
    expect(verifyDistfDigitalId(staleQr, REF_DATE, 18, now)?.verdict).toBe('INVALID_DOC');

    const fakeIssuer = JSON.stringify({
      issuer: 'fake-id-app.com',
      age_over_18: true,
      iat: now,
    });
    expect(verifyDistfDigitalId(fakeIssuer, REF_DATE, 18, now)?.verdict).toBe('INVALID_DOC');
  });

  it('validates intact SHA-256 audit hash chain and detects tampered rows', () => {
    const e1Base = {
      timestampIso: '2026-11-27T01:00:00.000Z',
      staffRole: 'Security Staff',
      docType: 'NZ_DRIVER_LICENCE',
      verdict: 'PASS_18_PLUS',
    };
    const h1 = computeAuditEventHash(GENESIS_HASH, e1Base);
    const e2Base = {
      timestampIso: '2026-11-27T01:02:00.000Z',
      staffRole: 'Security Staff',
      docType: 'KIWI_ACCESS',
      verdict: 'UNDER_18',
    };
    const h2 = computeAuditEventHash(h1, e2Base);
    const events = [
      { ...e1Base, prevHash: GENESIS_HASH, eventHash: h1 },
      { ...e2Base, prevHash: h1, eventHash: h2 },
    ];
    expect(verifyAuditHashChain(events).valid).toBe(true);

    // Tamper with verdict on row 2
    const tampered = [events[0], { ...events[1], verdict: 'PASS_18_PLUS' }];
    expect(verifyAuditHashChain(tampered).valid).toBe(false);
  });

  it('derives ICAO 9303 ePassport BAC MRZ key input', () => {
    const bac = buildIcao9303BacInput('LA123456<', '980512', '310512');
    expect(bac?.mrzInfoString.length).toBe(24);
    expect(bac?.keySeedPreviewHash.length).toBe(16);
  });
});
