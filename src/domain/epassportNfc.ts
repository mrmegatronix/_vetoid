import { computeMrzCheckDigit } from './mrzParser';
import { sha256Hex } from './auditHashChain';

export interface EPassportBacKeyInput {
  mrzInfoString: string;
  keySeedPreviewHash: string;
}

export interface EPassportChipStatus {
  supported: boolean;
  platformNote: string;
  cscaBundleVersion: string;
}

/**
 * Bundled ICAO CSCA trust-anchor metadata (updated via OTA in Phase 3).
 */
export const CSCA_TRUST_BUNDLE_VERSION = 'ICAO-CSCA-NZ-2026.11';

/**
 * Derives the ICAO 9303 BAC MRZ_information string (DocNum + Check + DOB + Check + Exp + Check)
 * strictly in volatile memory for native IsoDep / CoreNFC chip authentication.
 */
export function buildIcao9303BacInput(
  docNumber9: string,
  dobYyMmDd: string,
  expYyMmDd: string
): EPassportBacKeyInput | null {
  const docPadded = docNumber9.toUpperCase().replace(/\s+/g, '').padEnd(9, '<').slice(0, 9);
  if (!/^\d{6}$/.test(dobYyMmDd) || !/^\d{6}$/.test(expYyMmDd)) return null;

  const docCheck = computeMrzCheckDigit(docPadded);
  const dobCheck = computeMrzCheckDigit(dobYyMmDd);
  const expCheck = computeMrzCheckDigit(expYyMmDd);
  if (docCheck < 0 || dobCheck < 0 || expCheck < 0) return null;

  const mrzInfoString = `${docPadded}${docCheck}${dobYyMmDd}${dobCheck}${expYyMmDd}${expCheck}`;
  return {
    mrzInfoString,
    keySeedPreviewHash: sha256Hex(mrzInfoString).slice(0, 16),
  };
}

/**
 * Checks whether the current runtime supports NFC ePassport chip reading.
 */
export function getEPassportNfcStatus(platformOs: string = 'web'): EPassportChipStatus {
  if (platformOs === 'android') {
    return {
      supported: true,
      platformNote: 'Android IsoDep NFC ready (hold passport cover to rear NFC antenna).',
      cscaBundleVersion: CSCA_TRUST_BUNDLE_VERSION,
    };
  }
  if (platformOs === 'ios') {
    return {
      supported: true,
      platformNote: 'iOS CoreNFC ready (hold passport to top edge of iPhone).',
      cscaBundleVersion: CSCA_TRUST_BUNDLE_VERSION,
    };
  }
  const hasWebNfc =
    typeof window !== 'undefined' && 'NDEFReader' in window;
  return {
    supported: hasWebNfc,
    platformNote: hasWebNfc
      ? 'Android Chrome Web NFC detected.'
      : 'Browser does not support ISO 7816 NFC — use native VetoID Android/iOS app for chip auth.',
    cscaBundleVersion: CSCA_TRUST_BUNDLE_VERSION,
  };
}
