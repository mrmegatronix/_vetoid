import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerificationResult } from '../types/verification';

interface VerdictOverlayProps {
  result: VerificationResult;
  autoResetSeconds: number;
  showUnder25Cue: boolean;
  requireFaceConfirm: boolean;
  onDismiss: () => void;
  onFaceMismatchRefuse: () => void;
  onOpenPatronQr: () => void;
}

const VERDICT_PALETTE = {
  PASS_18_PLUS: {
    bg: '#00C853',
    badgeBg: 'rgba(0, 0, 0, 0.25)',
    headline: 'PASS 18+',
  },
  UNDER_18: {
    bg: '#D50000',
    badgeBg: 'rgba(0, 0, 0, 0.30)',
    headline: 'UNDER 18',
  },
  EXPIRED: {
    bg: '#FFAB00',
    badgeBg: 'rgba(0, 0, 0, 0.28)',
    headline: 'EXPIRED',
  },
  INVALID_DOC: {
    bg: '#AA00FF',
    badgeBg: 'rgba(0, 0, 0, 0.28)',
    headline: 'NOT ACCEPTED',
  },
} as const;

export const VerdictOverlay: React.FC<VerdictOverlayProps> = ({
  result,
  autoResetSeconds,
  showUnder25Cue,
  requireFaceConfirm,
  onDismiss,
  onFaceMismatchRefuse,
  onOpenPatronQr,
}) => {
  const [patronMode, setPatronMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(autoResetSeconds);

  const shouldAutoReset =
    !patronMode && !(requireFaceConfirm && result.verdict === 'PASS_18_PLUS');

  useEffect(() => {
    setSecondsLeft(autoResetSeconds);
  }, [result, autoResetSeconds]);

  useEffect(() => {
    if (!shouldAutoReset || autoResetSeconds <= 0) return;
    if (secondsLeft <= 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [shouldAutoReset, secondsLeft, autoResetSeconds, onDismiss]);

  const palette = VERDICT_PALETTE[result.verdict];
  const isLightBg = result.verdict === 'EXPIRED';
  const primaryTextColor = isLightBg ? '#111111' : '#FFFFFF';

  if (patronMode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0D12' }]}>
        <View style={styles.patronCard}>
          <Text style={styles.patronEyebrow}>NEW ZEALAND LEGAL NOTICE</Text>
          <Text style={styles.patronTitle}>{result.reasonTitle}</Text>
          <Text style={styles.patronBody}>{result.patronLegalNotice}</Text>
          <Text style={styles.patronPrivacy}>
            Privacy Notice (NZ Privacy Act 2020): VetoID processes age checks strictly
            in temporary memory. Zero photos, names, or ID numbers are saved.
          </Text>
          <Pressable
            style={styles.patronQrBtn}
            onPress={onOpenPatronQr}
            accessibilityRole="button"
          >
            <Text style={styles.patronQrText}>SHOW PATRON PRIVACY QR</Text>
          </Pressable>
          <Pressable
            style={styles.patronBackBtn}
            onPress={() => setPatronMode(false)}
            accessibilityRole="button"
          >
            <Text style={styles.patronBackText}>RETURN TO STAFF VIEW</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <Pressable
        style={styles.tapArea}
        onPress={requireFaceConfirm && result.verdict === 'PASS_18_PLUS' ? undefined : onDismiss}
      >
        {/* Top Row: Document Type + Auto-reset countdown */}
        <View style={styles.topBar}>
          <View style={[styles.docPill, { backgroundColor: palette.badgeBg }]}>
            <Text style={[styles.docPillText, { color: primaryTextColor }]} numberOfLines={1}>
              {result.docLabel}
            </Text>
          </View>
          {shouldAutoReset && (
            <View style={[styles.timerPill, { backgroundColor: palette.badgeBg }]}>
              <Text style={[styles.timerText, { color: primaryTextColor }]}>
                {secondsLeft}s
              </Text>
            </View>
          )}
        </View>

        {/* Under-25 Heightened Cue (NZ Ask 25 Host Responsibility) */}
        {result.verdict === 'PASS_18_PLUS' && showUnder25Cue && result.isUnder25 && (
          <View style={styles.under25Banner}>
            <Text style={styles.under25Text} numberOfLines={1}>
              CHECK CLOSELY (&lt;25) — VERIFY LIKENESS
            </Text>
          </View>
        )}

        {/* Center Verdict Readout */}
        <View style={styles.centerBlock}>
          <Text style={[styles.headline, { color: primaryTextColor }]} numberOfLines={1}>
            {palette.headline}
          </Text>

          {result.ageYears !== null && (
            <Text style={[styles.giantAge, { color: primaryTextColor }]}>
              {result.ageYears}
            </Text>
          )}

          <Text style={[styles.reasonText, { color: primaryTextColor }]} numberOfLines={2}>
            {result.reasonTitle}
          </Text>

          {/* Compact Metadata Strip (Zero PII) */}
          <View style={[styles.metaRow, { backgroundColor: palette.badgeBg }]}>
            {result.dobDisplay && (
              <Text style={[styles.metaText, { color: primaryTextColor }]}>
                DOB: {result.dobDisplay}
              </Text>
            )}
            {result.expiryDateDisplay && (
              <Text style={[styles.metaText, { color: primaryTextColor }]}>
                EXP: {result.expiryDateDisplay}
              </Text>
            )}
          </View>

          {/* Human-Only Visual Match Prompt (No Biometrics) */}
          {result.verdict === 'PASS_18_PLUS' && (
            <View style={styles.matchFaceBox}>
              <Text style={styles.matchFaceTitle}>MATCH FACE TO PHOTO</Text>
              <Text style={styles.matchFaceSub}>{result.tactileCue}</Text>
            </View>
          )}

          {result.verdict !== 'PASS_18_PLUS' && (
            <Text style={[styles.tactileCue, { color: primaryTextColor }]}>
              {result.tactileCue}
            </Text>
          )}
        </View>

        {/* Bottom Thumb-Zone Actions */}
        <View style={styles.bottomActions}>
          {result.verdict === 'PASS_18_PLUS' && (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.refuseBtn}
                onPress={onFaceMismatchRefuse}
                accessibilityRole="button"
              >
                <Text style={styles.refuseBtnText} numberOfLines={1}>
                  NO MATCH — REFUSE
                </Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={onDismiss}
                accessibilityRole="button"
              >
                <Text style={styles.confirmBtnText} numberOfLines={1}>
                  CONFIRM &amp; NEXT
                </Text>
              </Pressable>
            </View>
          )}

          {result.verdict !== 'PASS_18_PLUS' && (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.showPatronBtn}
                onPress={() => setPatronMode(true)}
                accessibilityRole="button"
              >
                <Text style={styles.showPatronText} numberOfLines={1}>
                  SHOW PATRON
                </Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={onDismiss}
                accessibilityRole="button"
              >
                <Text style={styles.confirmBtnText} numberOfLines={1}>
                  NEXT PATRON
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  tapArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  docPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '78%',
  },
  docPillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  timerPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  under25Banner: {
    backgroundColor: '#FFD600',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  under25Text: {
    color: '#111111',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headline: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  giantAge: {
    fontSize: 112,
    fontWeight: '900',
    lineHeight: 118,
    fontVariant: ['tabular-nums'],
  },
  reasonText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  matchFaceBox: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    width: '100%',
  },
  matchFaceTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  matchFaceSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  tactileCue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.92,
  },
  bottomActions: {
    width: '100%',
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  refuseBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#B71C1C',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  refuseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  showPatronBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  showPatronText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  patronCard: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },
  patronEyebrow: {
    color: '#00C4FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  patronTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  patronBody: {
    color: '#E5E7EB',
    fontSize: 18,
    lineHeight: 26,
  },
  patronPrivacy: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 14,
  },
  patronQrBtn: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#131820',
    borderWidth: 1.5,
    borderColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patronQrText: {
    color: '#00FF88',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  patronBackBtn: {
    marginTop: 12,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#00C4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patronBackText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
