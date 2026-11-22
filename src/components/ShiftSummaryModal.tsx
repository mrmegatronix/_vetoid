import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShiftTally, VenueSettings } from '../types/verification';

interface ShiftSummaryModalProps {
  visible: boolean;
  tally: ShiftTally;
  settings: VenueSettings;
  onUpdateSettings: (next: VenueSettings) => void;
  onResetShift: () => void;
  onClose: () => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  visible,
  tally,
  settings,
  onUpdateSettings,
  onResetShift,
  onClose,
}) => {
  const [showSignage, setShowSignage] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>SHIFT TALLY &amp; SETTINGS</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>DONE</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionLabel}>
              ANONYMOUS SHIFT COUNTERS (ZERO PII STORED)
            </Text>

            <View style={styles.statGrid}>
              <StatTile label="TOTAL SCANS" value={tally.totalScanned} accent="#00C4FF" />
              <StatTile label="PASS 18+" value={tally.pass18Plus} accent="#00C853" />
              <StatTile label="UNDER 18" value={tally.under18} accent="#D50000" />
              <StatTile label="EXPIRED" value={tally.expired} accent="#FFAB00" />
              <StatTile label="INVALID DOC" value={tally.invalidDoc} accent="#AA00FF" />
              <StatTile label="FACE REFUSAL" value={tally.faceMismatchRefusals} accent="#FF6B6B" />
            </View>

            <Pressable style={styles.resetBtn} onPress={onResetShift}>
              <Text style={styles.resetBtnText}>RESET SHIFT COUNTERS</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>DOOR OPERATIONS</Text>
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
                  Disables auto-reset on PASS until staff tap Confirm or Refuse
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
    maxHeight: '88%',
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
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
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
    fontSize: 15,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
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
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  resetBtn: {
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
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
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
    fontSize: 13,
    fontWeight: '900',
  },
  signageBody: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
  },
});
