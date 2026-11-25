import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClockTamperGuard } from '../domain/nzDateTime';
import {
  evaluateScannedDocumentText,
  PRACTICE_DRILL_CARDS,
} from '../domain/nzIdParser';
import {
  createEmptyShiftTally,
  loadShiftTally,
  loadVenueSettings,
  recordAnonymousVerdict,
  recordFaceMismatchRefusal,
  resetShiftTally,
  saveVenueSettings,
} from '../storage/shiftStore';
import {
  DEFAULT_VENUE_SETTINGS,
  ShiftTally,
  VenueSettings,
  VerificationResult,
} from '../types/verification';
import { triggerVerdictHaptics } from '../utils/haptics';
import { ManualDobModal } from './ManualDobModal';
import { PinGateModal } from './PinGateModal';
import { ShareQrModal } from './ShareQrModal';
import { ShiftSummaryModal } from './ShiftSummaryModal';
import { VerdictOverlay } from './VerdictOverlay';

export const ScannerScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState<VerificationResult | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shareQrOpen, setShareQrOpen] = useState(false);
  const [tally, setTally] = useState<ShiftTally>(createEmptyShiftTally());
  const [settings, setSettings] = useState<VenueSettings>(DEFAULT_VENUE_SETTINGS);
  const [clockTampered, setClockTampered] = useState(false);
  const [clockState, setClockState] = useState({ hh: '00', mm: '00', colonOn: true });

  const clockGuardRef = useRef(new ClockTamperGuard());

  useEffect(() => {
    loadShiftTally().then(setTally);
    loadVenueSettings().then(setSettings);
  }, []);

  // Live NZ clock with blinking colon + monotonic clock-drift guard
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
      const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
      setClockState((prev) => ({ hh, mm, colonOn: !prev.colonOn }));

      const drift = clockGuardRef.current.checkDrift();
      if (drift.isTampered) {
        setClockTampered(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const presentVerdict = useCallback(
    async (result: VerificationResult) => {
      setActiveVerdict(result);
      triggerVerdictHaptics(result.verdict);
      const updated = await recordAnonymousVerdict(tally, result);
      setTally(updated);
    },
    [tally]
  );

  const handleDismissVerdict = useCallback(() => {
    // Strictly clear RAM reference immediately on dismissal
    setActiveVerdict(null);
  }, []);

  const handleFaceMismatch = useCallback(async () => {
    const updated = await recordFaceMismatchRefusal(tally);
    setTally(updated);
    setActiveVerdict(null);
  }, [tally]);

  const handleRunPracticeCard = (rawOcrText: string) => {
    setDrillModalOpen(false);
    const res = evaluateScannedDocumentText(rawOcrText, undefined, settings.minimumAge);
    presentVerdict(res);
  };

  const handleUpdateSettings = async (next: VenueSettings) => {
    setSettings(next);
    await saveVenueSettings(next);
  };

  const handleResetShift = async () => {
    const fresh = await resetShiftTally();
    setTally(fresh);
  };

  const cameraReady = permission?.granted === true;

  const bottomControls = [
    {
      key: 'torch',
      label: torchOn ? 'TORCH ON' : 'TORCH',
      active: torchOn,
      onPress: () => setTorchOn((t) => !t),
    },
    {
      key: 'manual',
      label: 'MANUAL DOB',
      active: false,
      onPress: () => setManualModalOpen(true),
    },
    {
      key: 'drill',
      label: 'TEST / DRILL',
      active: false,
      onPress: () => setDrillModalOpen(true),
    },
    {
      key: 'shift',
      label: `SHIFT (${tally.totalScanned})`,
      active: false,
      onPress: () => setPinModalOpen(true),
    },
  ];

  const orderedControls = settings.leftHandedMode
    ? [...bottomControls].reverse()
    : bottomControls;

  return (
    <SafeAreaView style={styles.root}>
      {/* Top OLED Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>VetoID</Text>
          <View style={styles.nzBadge}>
            <Text style={styles.nzBadgeText}>NZ 18+</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={styles.qrBtn}
            onPress={() => setShareQrOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Share QR code"
          >
            <Text style={styles.qrBtnText}>QR</Text>
          </Pressable>
          <View style={styles.clockPill}>
            <Text style={styles.clockText}>
              {clockState.hh}
              <Text style={{ opacity: clockState.colonOn ? 1 : 0 }}>:</Text>
              {clockState.mm}
            </Text>
            <Text style={styles.zeroPiiTag}>ZERO-PII</Text>
          </View>
        </View>
      </View>

      {clockTampered && (
        <View style={styles.clockWarnBanner}>
          <Text style={styles.clockWarnText} numberOfLines={1}>
            CLOCK DRIFT DETECTED — VERIFY DEVICE DATE/TIME
          </Text>
        </View>
      )}

      {/* Always-Hot Live Camera Viewfinder */}
      <View style={styles.viewfinderWrap}>
        {cameraReady && Platform.OS !== 'web' ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackTitle}>
              {Platform.OS === 'web'
                ? 'WEB PREVIEW MODE'
                : 'CAMERA PERMISSION REQUIRED'}
            </Text>
            <Text style={styles.fallbackSub}>
              {Platform.OS === 'web'
                ? 'Use TEST / DRILL or MANUAL DOB below to test all 4 NZ SSAA 2012 verdicts.'
                : 'VetoID processes frames strictly in RAM. Zero photos are saved.'}
            </Text>
            {Platform.OS !== 'web' && (
              <Pressable style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>ENABLE CAMERA</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Document Alignment Frame Overlay */}
        <View pointerEvents="none" style={styles.reticleOverlay}>
          <View style={styles.reticleBox}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <Text style={styles.reticleHint} numberOfLines={1}>
            ALIGN NZDL • KIWI ACCESS • PASSPORT MRZ
          </Text>
          <Text style={styles.glareHint} numberOfLines={1}>
            TILT SLIGHTLY TO AVOID LAMINATE GLARE
          </Text>
        </View>
      </View>

      {/* Bottom-Third One-Handed Thumb Zone */}
      <View style={styles.thumbZone}>
        <View style={styles.buttonGrid}>
          {orderedControls.map((btn) => (
            <Pressable
              key={btn.key}
              style={[styles.thumbBtn, btn.active && styles.thumbBtnActive]}
              onPress={btn.onPress}
              accessibilityRole="button"
            >
              <Text
                style={[styles.thumbBtnText, btn.active && styles.thumbBtnTextActive]}
                numberOfLines={1}
              >
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Full-Screen 4-State Verdict Overlay */}
      {activeVerdict && (
        <VerdictOverlay
          result={activeVerdict}
          autoResetSeconds={settings.autoResetSeconds}
          showUnder25Cue={settings.showUnder25Cue}
          requireFaceConfirm={settings.requireFaceConfirm}
          onDismiss={handleDismissVerdict}
          onFaceMismatchRefuse={handleFaceMismatch}
        />
      )}

      {/* Manual DOB Fallback Modal */}
      <ManualDobModal
        visible={manualModalOpen}
        minimumAge={settings.minimumAge}
        onClose={() => setManualModalOpen(false)}
        onVerified={(res) => {
          setManualModalOpen(false);
          presentVerdict(res);
        }}
      />

      {/* 30-Second Staff Practice Drill / Synthetic Test Cards */}
      <Modal visible={drillModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.drillBackdrop}>
          <View style={styles.drillSheet}>
            <View style={styles.drillHeader}>
              <Text style={styles.drillTitle}>30s STAFF DRILL &amp; TEST IDs</Text>
              <Pressable onPress={() => setDrillModalOpen(false)}>
                <Text style={styles.drillClose}>CLOSE</Text>
              </Pressable>
            </View>
            <Text style={styles.drillSub}>
              Tap any synthetic NZ test ID to preview the full-screen verdict &amp; haptics.
            </Text>
            <ScrollView contentContainerStyle={styles.drillList}>
              {PRACTICE_DRILL_CARDS.map((card) => (
                <Pressable
                  key={card.id}
                  style={styles.drillCard}
                  onPress={() => handleRunPracticeCard(card.rawOcrText)}
                >
                  <Text style={styles.drillCardTitle}>{card.label}</Text>
                  <Text style={styles.drillCardSub}>{card.subtitle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* PIN Gate (pin-coded-access standard) */}
      <PinGateModal
        visible={pinModalOpen}
        expectedPin={settings.staffPin}
        onCancel={() => setPinModalOpen(false)}
        onSuccess={() => {
          setPinModalOpen(false);
          setShiftModalOpen(true);
        }}
      />

      {/* PIN-Gated Anonymous Shift Summary & Settings */}
      <ShiftSummaryModal
        visible={shiftModalOpen}
        tally={tally}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetShift={handleResetShift}
        onClose={() => setShiftModalOpen(false)}
      />

      {/* Offline Share QR Code Modal */}
      <ShareQrModal
        visible={shareQrOpen}
        onClose={() => setShareQrOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#000000',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  nzBadge: {
    backgroundColor: '#00C4FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  nzBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrBtn: {
    backgroundColor: 'rgba(0,196,255,0.16)',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  qrBtnText: {
    color: '#00C4FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#11161F',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  clockText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  zeroPiiTag: {
    color: '#00FF88',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  clockWarnBanner: {
    backgroundColor: '#D50000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  clockWarnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  viewfinderWrap: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0A0D12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFallback: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fallbackSub: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  permBtn: {
    marginTop: 6,
    backgroundColor: '#00C4FF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  permBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  reticleBox: {
    width: '88%',
    aspectRatio: 1.586, // ISO/IEC 7810 ID-1 card aspect ratio (NZDL / Kiwi Access)
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#00C4FF',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  reticleHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  glareHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  thumbZone: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#000000',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  thumbBtn: {
    width: '48.4%',
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#131820',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  thumbBtnActive: {
    backgroundColor: 'rgba(0,196,255,0.18)',
    borderColor: '#00C4FF',
  },
  thumbBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  thumbBtnTextActive: {
    color: '#00C4FF',
  },
  drillBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  drillSheet: {
    backgroundColor: '#0A0D12',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 20,
    maxHeight: '72%',
    gap: 10,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drillTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  drillClose: {
    color: '#00C4FF',
    fontWeight: '800',
    fontSize: 14,
  },
  drillSub: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  drillList: {
    gap: 10,
    paddingBottom: 16,
  },
  drillCard: {
    backgroundColor: '#131820',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  drillCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  drillCardSub: {
    color: '#00C4FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
