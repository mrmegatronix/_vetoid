import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verifyAuditHashChain } from '../domain/auditHashChain';
import { getEPassportNfcStatus } from '../domain/epassportNfc';
import { buildShiftBackupCsv } from '../storage/shiftStore';
import {
  ShiftBackupRecord,
  ShiftTally,
  STAFF_ROLES,
  StaffRole,
  VenueSettings,
} from '../types/verification';

interface ShiftSummaryModalProps {
  visible: boolean;
  tally: ShiftTally;
  backups: ShiftBackupRecord[];
  trespassCount: number;
  settings: VenueSettings;
  isUnlocked: boolean;
  onUpdateSettings: (next: VenueSettings) => void;
  onChangeStaffRole: (role: StaffRole) => void;
  onEndShiftAndBackup: () => Promise<ShiftBackupRecord>;
  onResetShift: () => void;
  onOpenTrespassRegister: () => void;
  onPrintTestIds: () => void;
  onEnterStandby: () => void;
  onLockNow: () => void;
  onClose: () => void;
}

const HOLD_OPTIONS = [
  { label: '5s', value: 5 },
  { label: '8s', value: 8 },
  { label: '12s', value: 12 },
  { label: 'HOLD', value: 0 },
];

const AGE_POLICY_OPTIONS = [18, 20, 25];
const CAPACITY_OPTIONS = [100, 150, 250, 500];

function formatShiftDuration(startIso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(startIso).getTime());
  const totalMins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

function formatNzShortTime(iso: string): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

async function exportBackupFile(record: ShiftBackupRecord): Promise<void> {
  const csv = buildShiftBackupCsv(record);
  const filename = `vetoid-shift-${record.shiftEndedAt.slice(0, 10)}.csv`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: csv,
  });
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  visible,
  tally,
  backups,
  trespassCount,
  settings,
  isUnlocked,
  onUpdateSettings,
  onChangeStaffRole,
  onEndShiftAndBackup,
  onResetShift,
  onOpenTrespassRegister,
  onPrintTestIds,
  onEnterStandby,
  onLockNow,
  onClose,
}) => {
  const [showSignage, setShowSignage] = useState(false);
  const [backupNotice, setBackupNotice] = useState('');
  const chainStatus = verifyAuditHashChain(tally.events);
  const nfcStatus = getEPassportNfcStatus(Platform.OS);

  const handleEndOfDayBackup = async () => {
    const record = await onEndShiftAndBackup();
    await exportBackupFile(record);
    setBackupNotice(`Shift archived & CSV exported (${record.totalScanned} scans).`);
    setTimeout(() => setBackupNotice(''), 3500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>SHIFT &amp; SETTINGS</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>DONE</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Active Shift Timing & Staff Position */}
            <Text style={styles.sectionLabel}>ACTIVE SHIFT &amp; STAFF POSITION</Text>
            <View style={styles.shiftMetaCard}>
              <Text style={styles.shiftMetaLine}>
                Started: <Text style={styles.bold}>{formatNzShortTime(tally.shiftStartedAt)}</Text>
                {'  •  '}
                Elapsed: <Text style={styles.accentBold}>{formatShiftDuration(tally.shiftStartedAt)}</Text>
              </Text>
              <View style={styles.roleRow}>
                {STAFF_ROLES.map((role) => {
                  const active = tally.staffRole === role;
                  return (
                    <Pressable
                      key={role}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                      onPress={() => onChangeStaffRole(role)}
                    >
                      <Text
                        style={[styles.roleChipText, active && styles.roleChipTextActive]}
                        numberOfLines={1}
                      >
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              ANONYMOUS SHIFT COUNTERS ({chainStatus.valid ? 'SHA-256 CHAIN INTACT' : 'CHAIN MISMATCH'})
            </Text>

            <View style={styles.statGrid}>
              <StatTile label="TOTAL SCANS" value={tally.totalScanned} accent="#00C4FF" />
              <StatTile label="PASS 18+" value={tally.pass18Plus} accent="#00C853" />
              <StatTile label="UNDER 18" value={tally.under18} accent="#D50000" />
              <StatTile label="EXPIRED" value={tally.expired} accent="#FFAB00" />
              <StatTile label="INVALID DOC" value={tally.invalidDoc} accent="#AA00FF" />
              <StatTile label="FACE REFUSAL" value={tally.faceMismatchRefusals} accent="#FF6B6B" />
            </View>

            {/* Quick Venue Tools: Trespass Register & Printable Training IDs */}
            <Text style={styles.sectionLabel}>VENUE SECURITY &amp; STAFF TRAINING</Text>
            <View style={styles.standbyActionsRow}>
              <Pressable style={styles.trespassBtn} onPress={onOpenTrespassRegister}>
                <Text style={styles.trespassBtnText} numberOfLines={1}>
                  BANNED LIST ({trespassCount})
                </Text>
              </Pressable>
              <Pressable style={styles.standbyBtn} onPress={onPrintTestIds}>
                <Text style={styles.standbyBtnText} numberOfLines={1}>
                  PRINT TEST IDs
                </Text>
              </Pressable>
            </View>

            {/* End-of-Day Backup & Reset */}
            <View style={styles.standbyActionsRow}>
              <Pressable style={styles.backupBtn} onPress={handleEndOfDayBackup}>
                <Text style={styles.backupBtnText} numberOfLines={1}>
                  END SHIFT &amp; BACKUP CSV
                </Text>
              </Pressable>
              <Pressable style={styles.resetBtnSmall} onPress={onResetShift}>
                <Text style={styles.resetBtnText} numberOfLines={1}>
                  RESET
                </Text>
              </Pressable>
            </View>
            {backupNotice ? <Text style={styles.backupNotice}>{backupNotice}</Text> : null}

            {/* Recent Anonymous CCTV Timestamp Log */}
            {tally.events.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>RECENT SCAN TIMESTAMPS (CCTV SYNC)</Text>
                <View style={styles.logCard}>
                  {[...tally.events].reverse().slice(0, 5).map((ev, idx) => (
                    <Text key={`${ev.timestampIso}-${idx}`} style={styles.logRow} numberOfLines={1}>
                      {ev.nzTime} • {ev.verdict} • {ev.staffRole}
                    </Text>
                  ))}
                </View>
              </>
            )}

            {/* End-of-Day Archived Backups */}
            {backups.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>END-OF-DAY SHIFT ARCHIVE ({backups.length})</Text>
                <View style={styles.logCard}>
                  {backups.slice(0, 5).map((b) => (
                    <View key={b.id} style={styles.archiveRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.archiveTitle} numberOfLines={1}>
                          {formatNzShortTime(b.shiftStartedAt)} • {b.staffRole}
                        </Text>
                        <Text style={styles.archiveSub} numberOfLines={1}>
                          Total: {b.totalScanned} | Pass: {b.pass18Plus} | U18: {b.under18} | Exp: {b.expired}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.exportMiniBtn}
                        onPress={() => exportBackupFile(b)}
                      >
                        <Text style={styles.exportMiniText}>CSV</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>VENUE AGE POLICY (MINIMUM ENTRY AGE)</Text>
            <View style={styles.roleRow}>
              {AGE_POLICY_OPTIONS.map((age) => {
                const active = settings.minimumAge === age;
                return (
                  <Pressable
                    key={age}
                    style={[styles.holdChip, active && styles.roleChipActive]}
                    onPress={() =>
                      onUpdateSettings({ ...settings, minimumAge: age })
                    }
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      R{age}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>VENUE CAPACITY LIMIT &amp; HEADCOUNT</Text>
            <View style={styles.roleRow}>
              {CAPACITY_OPTIONS.map((cap) => {
                const active = settings.venueCapacity === cap;
                return (
                  <Pressable
                    key={cap}
                    style={[styles.holdChip, active && styles.roleChipActive]}
                    onPress={() =>
                      onUpdateSettings({ ...settings, venueCapacity: cap })
                    }
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {cap}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Auto +1 Headcount on PASS</Text>
                <Text style={styles.settingSub}>
                  Current: {tally.currentHeadcount ?? 0} / {settings.venueCapacity} • Peak: {tally.peakHeadcount ?? 0}
                </Text>
              </View>
              <Switch
                value={settings.autoIncrementHeadcount}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, autoIncrementHeadcount: v })
                }
                trackColor={{ false: '#374151', true: '#00C4FF' }}
              />
            </View>

            <Text style={styles.sectionLabel}>ePASSPORT NFC &amp; DISTF DIGITAL ID</Text>
            <View style={styles.shiftMetaCard}>
              <Text style={styles.shiftMetaLine}>
                NFC Status: <Text style={styles.accentBold}>{nfcStatus.supported ? 'READY' : 'NATIVE APP ONLY'}</Text>
              </Text>
              <Text style={styles.settingSub}>{nfcStatus.platformNote}</Text>
              <Text style={styles.settingSub}>
                CSCA Trust Bundle: {nfcStatus.cscaBundleVersion} • DISTF ISO 18013-5 QR Active
              </Text>
            </View>

            <Text style={styles.sectionLabel}>VERDICT DISPLAY HOLD TIME</Text>
            <View style={styles.roleRow}>
              {HOLD_OPTIONS.map((opt) => {
                const active = settings.autoResetSeconds === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    style={[styles.holdChip, active && styles.roleChipActive]}
                    onPress={() =>
                      onUpdateSettings({ ...settings, autoResetSeconds: opt.value })
                    }
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>DOOR OPERATIONS &amp; AUDIO</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Sound Effects</Text>
                <Text style={styles.settingSub}>
                  Audio chimes for Pass, Under-18 alarm, Expired, and keypad taps
                </Text>
              </View>
              <Switch
                value={settings.soundEffectsEnabled}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, soundEffectsEnabled: v })
                }
                trackColor={{ false: '#374151', true: '#00C4FF' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Show Under-25 Heightened Cue</Text>
                <Text style={styles.settingSub}>
                  Highlights ages 18–24 with Ask-25 reminder banner
                </Text>
              </View>
              <Switch
                value={settings.showUnder25Cue}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, showUnder25Cue: v })
                }
                trackColor={{ false: '#374151', true: '#00C4FF' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Require Face-Match Confirmation</Text>
                <Text style={styles.settingSub}>
                  Holds PASS screen until staff tap Confirm or Refuse
                </Text>
              </View>
              <Switch
                value={settings.requireFaceConfirm}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, requireFaceConfirm: v })
                }
                trackColor={{ false: '#374151', true: '#00C4FF' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Keep Unlocked (Quick Standby)</Text>
                <Text style={styles.settingSub}>
                  Stay unlocked during shift for instant 1-tap access &amp; OLED standby
                </Text>
              </View>
              <Switch
                value={settings.keepUnlockedStandby}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, keepUnlockedStandby: v })
                }
                trackColor={{ false: '#374151', true: '#00C4FF' }}
              />
            </View>

            {isUnlocked && (
              <View style={styles.standbyActionsRow}>
                <Pressable style={styles.standbyBtn} onPress={onEnterStandby}>
                  <Text style={styles.standbyBtnText} numberOfLines={1}>
                    QUICK STANDBY
                  </Text>
                </Pressable>
                <Pressable style={styles.lockBtn} onPress={onLockNow}>
                  <Text style={styles.lockBtnText} numberOfLines={1}>
                    LOCK NOW
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Left-Handed Thumb Layout</Text>
                <Text style={styles.settingSub}>
                  Mirrors bottom scanner controls for left-handed operation
                </Text>
              </View>
              <Switch
                value={settings.leftHandedMode}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, leftHandedMode: v })
                }
                trackColor={{ false: '#374151', true: '#00C4FF' }}
              />
            </View>

            <Text style={styles.sectionLabel}>NZ PRIVACY ACT 2020 (IPP 3)</Text>
            <Pressable
              style={styles.signageToggle}
              onPress={() => setShowSignage((s) => !s)}
            >
              <Text style={styles.signageToggleText}>
                {showSignage ? 'HIDE ENTRY SIGNAGE NOTICE' : 'VIEW OPC ENTRY SIGNAGE NOTICE'}
              </Text>
            </Pressable>

            {showSignage && (
              <View style={styles.signageCard}>
                <Text style={styles.signageTitle}>
                  AGE VERIFICATION NOTICE (PRIVACY ACT 2020)
                </Text>
                <Text style={styles.signageBody}>
                  • Purpose: IDs are scanned solely to verify you are 18+ under the Sale
                  and Supply of Alcohol Act 2012.{'\n'}
                  • Zero Retention: All scanning occurs on-device in temporary memory. No
                  names, photos, or ID numbers are saved or transmitted.{'\n'}
                  • Anonymous Audit: Only scan timestamps and aggregate counts are logged.{'\n'}
                  • Visual Option: You may request a manual visual ID check at any time.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const StatTile: React.FC<{ label: string; value: number; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <View style={[styles.statTile, { borderLeftColor: accent }]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#0A0D12',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    color: '#00C4FF',
    fontWeight: '800',
    fontSize: 16,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 28,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
  },
  shiftMetaCard: {
    backgroundColor: '#131820',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  shiftMetaLine: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  accentBold: {
    color: '#00FF88',
    fontWeight: '900',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#1B2230',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  holdChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#1B2230',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: '#00C4FF',
    borderColor: '#00C4FF',
  },
  roleChipText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '800',
  },
  roleChipTextActive: {
    color: '#000000',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  statTile: {
    width: '48%',
    backgroundColor: '#131820',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  backupBtn: {
    flex: 2,
    backgroundColor: 'rgba(0,255,136,0.16)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backupBtnText: {
    color: '#00FF88',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  resetBtnSmall: {
    flex: 1,
    backgroundColor: 'rgba(255,107,107,0.14)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FF6B6B',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  backupNotice: {
    color: '#00FF88',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: '#131820',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  logRow: {
    color: '#D1D5DB',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 8,
  },
  archiveTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  archiveSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  exportMiniBtn: {
    backgroundColor: 'rgba(0,196,255,0.16)',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportMiniText: {
    color: '#00C4FF',
    fontSize: 12,
    fontWeight: '900',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131820',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  settingSub: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  standbyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trespassBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,23,68,0.16)',
    borderWidth: 1,
    borderColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  trespassBtnText: {
    color: '#FF5252',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  standbyBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,196,255,0.16)',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  standbyBtnText: {
    color: '#00C4FF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  lockBtn: {
    flex: 1,
    backgroundColor: '#1F2430',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lockBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  signageToggle: {
    backgroundColor: '#131820',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signageToggleText: {
    color: '#00C4FF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  signageCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 8,
  },
  signageTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  signageBody: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 21,
  },
});
