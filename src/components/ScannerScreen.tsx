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
  archiveShiftEndOfDay,
  createEmptyShiftTally,
  loadShiftBackups,
  loadShiftTally,
  loadVenueSettings,
  recordAnonymousVerdict,
  recordFaceMismatchRefusal,
  resetShiftTally,
  saveVenueSettings,
  updateShiftStaffRole,
} from '../storage/shiftStore';
import {
  DEFAULT_VENUE_SETTINGS,
  ShiftBackupRecord,
  ShiftTally,
  StaffRole,
  VenueSettings,
  VerificationResult,
} from '../types/verification';
import { triggerVerdictHaptics } from '../utils/haptics';
import {
  playScanShutterSound,
  playUnlockSound,
  playVerdictSound,
} from '../utils/sounds';
import { InfoModal } from './InfoModal';
import { ManualDobModal } from './ManualDobModal';
import { PinGateModal } from './PinGateModal';
import { ShareQrModal } from './ShareQrModal';
import { ShiftSummaryModal } from './ShiftSummaryModal';
import { VerdictOverlay } from './VerdictOverlay';
import {
  WebCameraScanner,
  WebCameraScannerHandle,
} from './WebCameraScanner';

export const ScannerScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState<VerificationResult | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shareQrOpen, setShareQrOpen] = useState(false);
  const [qrMode, setQrMode] = useState<'patron' | 'app'>('patron');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  const [standbyDimmed, setStandbyDimmed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [tally, setTally] = useState<ShiftTally>(createEmptyShiftTally());
  const [backups, setBackups] = useState<ShiftBackupRecord[]>([]);
  const [settings, setSettings] = useState<VenueSettings>(DEFAULT_VENUE_SETTINGS);
  const [clockTampered, setClockTampered] = useState(false);
  const [clockState, setClockState] = useState({ hh: '00', mm: '00', colonOn: true });

  const clockGuardRef = useRef(new ClockTamperGuard());
  const webScannerRef = useRef<WebCameraScannerHandle | null>(null);

  useEffect(() => {
    loadShiftTally().then(setTally);
    loadShiftBackups().then(setBackups);
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
      playVerdictSound(result.verdict, settings.soundEffectsEnabled);
      const updated = await recordAnonymousVerdict(tally, result);
      setTally(updated);
    },
    [tally, settings.soundEffectsEnabled]
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
    const fresh = await resetShiftTally(tally.staffRole);
    setTally(fresh);
  };

  const handleChangeStaffRole = async (role: StaffRole) => {
    const updated = await updateShiftStaffRole(tally, role);
    setTally(updated);
    await handleUpdateSettings({ ...settings, defaultStaffRole: role });
  };

  const handleEndShiftAndBackup = async (): Promise<ShiftBackupRecord> => {
    const { backup, backups: nextBackups, freshShift } = await archiveShiftEndOfDay(tally);
    setBackups(nextBackups);
    setTally(freshShift);
    return backup;
  };

  const handleToggleFullscreen = async () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Ignore browser fullscreen restrictions
    }
  };

  const handleOpenShift = () => {
    if (isSessionUnlocked && settings.keepUnlockedStandby) {
      setShiftModalOpen(true);
    } else {
      setPinModalOpen(true);
    }
  };

  const handlePinUnlocked = async (keepUnlocked: boolean) => {
    playUnlockSound(settings.soundEffectsEnabled);
    setPinModalOpen(false);
    setIsSessionUnlocked(keepUnlocked);
    if (keepUnlocked !== settings.keepUnlockedStandby) {
      await handleUpdateSettings({ ...settings, keepUnlockedStandby: keepUnlocked });
    }
    setShiftModalOpen(true);
  };

  const handleLockSession = () => {
    setIsSessionUnlocked(false);
    setStandbyDimmed(false);
    setShiftModalOpen(false);
  };

  const handleEnterStandby = () => {
    setShiftModalOpen(false);
    setTorchOn(false);
    setStandbyDimmed(true);
  };

  const handleScanLiveFrame = async () => {
    if (scanning) return;
    if (Platform.OS !== 'web') {
      setDrillModalOpen(true);
      return;
    }
    if (!webScannerRef.current) return;

    setScanning(true);
    playScanShutterSound(settings.soundEffectsEnabled);
    setScanStatus('CAPTURING FRAME...');
    try {
      const { text, error } = await webScannerRef.current.scanFrame();
      if (error) {
        setScanStatus(error);
        setTimeout(() => setScanStatus(''), 2600);
        return;
      }
      if (!text.trim()) {
        setScanStatus('NO TEXT DETECTED — HOLD STEADY & TRY AGAIN');
        setTimeout(() => setScanStatus(''), 2600);
        return;
      }
      setScanStatus('');
      const res = evaluateScannedDocumentText(text, undefined, settings.minimumAge);
      await presentVerdict(res);
    } finally {
      setScanning(false);
    }
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
      label: isSessionUnlocked && settings.keepUnlockedStandby
        ? `SHIFT (${tally.totalScanned}) • OPEN`
        : `SHIFT (${tally.totalScanned})`,
      active: isSessionUnlocked && settings.keepUnlockedStandby,
      onPress: handleOpenShift,
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
            <Text style={styles.nzBadgeText} numberOfLines={1}>
              {tally.staffRole}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {Platform.OS === 'web' && (
            <Pressable
              style={styles.infoBtn}
              onPress={handleToggleFullscreen}
              accessibilityRole="button"
              accessibilityLabel="Toggle fullscreen"
            >
              <Text style={styles.infoBtnText}>{isFullscreen ? 'EXIT' : 'FS'}</Text>
            </Pressable>
          )}
          {isSessionUnlocked && settings.keepUnlockedStandby && (
            <Pressable
              style={styles.standbyPillBtn}
              onPress={handleEnterStandby}
              accessibilityRole="button"
              accessibilityLabel="Enter quick standby"
            >
              <Text style={styles.standbyPillText}>STANDBY</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.infoBtn}
            onPress={() => setInfoModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="How to use VetoID"
          >
            <Text style={styles.infoBtnText}>INFO</Text>
          </Pressable>
          <Pressable
            style={styles.qrBtn}
            onPress={() => {
              setQrMode('patron');
              setShareQrOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Patron and Share QR code"
          >
            <Text style={styles.qrBtnText}>QR</Text>
          </Pressable>
          <View style={styles.clockPill}>
            <Text style={styles.clockText}>
              {clockState.hh}
              <Text style={{ opacity: clockState.colonOn ? 1 : 0 }}>:</Text>
              {clockState.mm}
            </Text>
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
        {Platform.OS === 'web' ? (
          <WebCameraScanner
            ref={webScannerRef}
            active={!standbyDimmed && !activeVerdict}
            torchOn={torchOn}
            onStatusChange={setScanStatus}
          />
        ) : cameraReady && !standbyDimmed ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackTitle}>CAMERA PERMISSION REQUIRED</Text>
            <Text style={styles.fallbackSub}>
              VetoID processes frames strictly in RAM. Zero photos are saved.
            </Text>
            <Pressable style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>ENABLE CAMERA</Text>
            </Pressable>
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
            {scanStatus || 'ALIGN NZDL • KIWI ACCESS • PASSPORT MRZ'}
          </Text>
          <Text style={styles.glareHint} numberOfLines={1}>
            TILT SLIGHTLY TO AVOID LAMINATE GLARE
          </Text>
        </View>
      </View>

      {/* Bottom-Third One-Handed Thumb Zone */}
      <View style={styles.thumbZone}>
        <Pressable
          style={[styles.scanPrimaryBtn, scanning && styles.scanPrimaryBtnBusy]}
          onPress={handleScanLiveFrame}
          disabled={scanning}
          accessibilityRole="button"
        >
          <Text style={styles.scanPrimaryText} numberOfLines={1}>
            {scanning ? 'SCANNING ID...' : 'SCAN ID'}
          </Text>
        </Pressable>

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
          onOpenPatronQr={() => {
            setQrMode('patron');
            setShareQrOpen(true);
          }}
        />
      )}

      {/* Manual DOB Fallback Modal */}
      <ManualDobModal
        visible={manualModalOpen}
        minimumAge={settings.minimumAge}
        soundEnabled={settings.soundEffectsEnabled}
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
        initialKeepUnlocked={settings.keepUnlockedStandby}
        onCancel={() => setPinModalOpen(false)}
        onSuccess={handlePinUnlocked}
      />

      {/* PIN-Gated Anonymous Shift Summary & Settings */}
      <ShiftSummaryModal
        visible={shiftModalOpen}
        tally={tally}
        backups={backups}
        settings={settings}
        isUnlocked={isSessionUnlocked && settings.keepUnlockedStandby}
        onUpdateSettings={handleUpdateSettings}
        onChangeStaffRole={handleChangeStaffRole}
        onEndShiftAndBackup={handleEndShiftAndBackup}
        onResetShift={handleResetShift}
        onEnterStandby={handleEnterStandby}
        onLockNow={handleLockSession}
        onClose={() => setShiftModalOpen(false)}
      />

      {/* How to Use & NZ Compliance Info Modal */}
      <InfoModal
        visible={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />

      {/* Offline Patron Info & App Share QR Modal */}
      <ShareQrModal
        visible={shareQrOpen}
        initialMode={qrMode}
        onClose={() => setShareQrOpen(false)}
      />

      {/* OLED Quick Standby Blackout Overlay (1-tap instant wake, stays unlocked) */}
      {standbyDimmed && (
        <Pressable
          style={styles.standbyOverlay}
          onPress={() => setStandbyDimmed(false)}
          accessibilityRole="button"
          accessibilityLabel="Wake VetoID from standby"
        >
          <Text style={styles.standbyBrand}>VetoID • QUICK STANDBY</Text>
          <Text style={styles.standbyClock}>
            {clockState.hh}
            <Text style={{ opacity: clockState.colonOn ? 1 : 0 }}>:</Text>
            {clockState.mm}
          </Text>
          <Text style={styles.standbyWakeHint}>TAP ANYWHERE TO WAKE SCANNER</Text>
          <Pressable
            style={styles.standbyLockBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleLockSession();
            }}
          >
            <Text style={styles.standbyLockText}>LOCK SESSION</Text>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  nzBadge: {
    backgroundColor: '#00C4FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nzBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standbyPillBtn: {
    backgroundColor: 'rgba(0,255,136,0.16)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  standbyPillText: {
    color: '#00FF88',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  infoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  qrBtn: {
    backgroundColor: 'rgba(0,196,255,0.16)',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  qrBtnText: {
    color: '#00C4FF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  standbyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  standbyBrand: {
    color: '#00FF88',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  standbyClock: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    opacity: 0.85,
  },
  standbyWakeHint: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  standbyLockBtn: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#11161F',
  },
  standbyLockText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  glareHint: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  thumbZone: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#000000',
    gap: 10,
  },
  scanPrimaryBtn: {
    width: '100%',
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: '#00C4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanPrimaryBtnBusy: {
    backgroundColor: '#0284C7',
    opacity: 0.85,
  },
  scanPrimaryText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  thumbBtn: {
    width: '48.4%',
    minHeight: 60,
    borderRadius: 14,
    backgroundColor: '#131820',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
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
