import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface InfoModalProps {
  visible: boolean;
  onOpenDeveloper: () => void;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  onOpenDeveloper,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>HOW TO USE VetoID</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>DONE</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Step-by-step */}
            <Text style={styles.sectionLabel}>1. QUICK DOOR WORKFLOW</Text>
            <View style={styles.card}>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Align ID:</Text> Hold NZ Driver Licence, Kiwi Access Card, or Passport MRZ inside the cyan frame. Tilt slightly if glare appears.
              </Text>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Read Instant Verdict:</Text> Full-screen colour and vibration confirm 18+ eligibility in under 2 seconds.
              </Text>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Match Face Manually:</Text> Visually compare the patron to the photo on their physical ID and check card holograms.
              </Text>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Worn Card / Visual Check:</Text> Tap <Text style={styles.bold}>MANUAL DOB</Text> for scratched cards or patrons requesting a manual check.
              </Text>
            </View>

            {/* Verdict Key */}
            <Text style={styles.sectionLabel}>2. VERDICT COLOURS &amp; HAPTICS</Text>
            <View style={styles.card}>
              <VerdictKeyRow color="#00C853" label="PASS 18+" desc="1 short tap • Valid & current (yellow cue if <25)" />
              <VerdictKeyRow color="#D50000" label="UNDER 18" desc="3 heavy buzzes • Shows days until 18th birthday" />
              <VerdictKeyRow color="#FFAB00" label="EXPIRED" desc="2 medium pulses • Expired IDs are invalid in NZ" />
              <VerdictKeyRow color="#AA00FF" label="NOT ACCEPTED" desc="2 medium pulses • Overseas licence / student ID" />
              <Text style={styles.tipText}>
                Tip: Tap SHOW PATRON on any reject screen to display a neutral NZ legal notice and de-escalate conflict.
              </Text>
            </View>

            {/* Approved NZ IDs */}
            <Text style={styles.sectionLabel}>3. APPROVED NZ IDs (SSAA 2012)</Text>
            <View style={styles.card}>
              <Text style={styles.acceptHead}>ACCEPTED (MUST BE CURRENT / UNEXPIRED)</Text>
              <Text style={styles.bullet}>• New Zealand Driver Licence</Text>
              <Text style={styles.bullet}>• Kiwi Access Card (or valid legacy HNZ 18+ Card)</Text>
              <Text style={styles.bullet}>• New Zealand or Overseas Passport</Text>
              <Text style={styles.bullet}>• Accredited NZ Digital ID (DISTF Act 2023)</Text>

              <Text style={styles.rejectHead}>NOT ACCEPTED IN NEW ZEALAND</Text>
              <Text style={styles.bullet}>
                • Overseas driver licences, expired IDs, temporary paper licences, phone photos/screenshots, Student IDs, SuperGold, Community Services, or Firearms licences.
              </Text>
            </View>

            {/* Quick Standby & PIN */}
            <Text style={styles.sectionLabel}>4. PIN UNLOCK &amp; QUICK STANDBY</Text>
            <View style={styles.card}>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Shift Tally &amp; Settings:</Text> Tap <Text style={styles.bold}>SHIFT</Text> and enter the venue staff PIN (configured in <Text style={styles.bold}>.env</Text>).
              </Text>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Keep Unlocked Standby:</Text> Enable <Text style={styles.bold}>Keep Unlocked</Text> when signing in to skip repeated PIN prompts during your shift and use 1-tap OLED <Text style={styles.bold}>STANDBY</Text> mode to save battery between patrons.
              </Text>
              <Text style={styles.bullet}>
                • <Text style={styles.bold}>Lock Anytime:</Text> Tap <Text style={styles.bold}>LOCK</Text> in Shift Settings when handing over the device.
              </Text>
            </View>

            {/* Privacy */}
            <Text style={styles.sectionLabel}>5. ZERO-PII PRIVACY (PRIVACY ACT 2020)</Text>
            <View style={styles.card}>
              <Text style={styles.bullet}>
                • 100% on-device RAM processing. Zero names, photos, or ID numbers are ever saved or sent to any server.
              </Text>
              <Text style={styles.bullet}>
                • Only anonymous shift totals (Pass / Under-18 / Expired / Invalid) are counted locally for Host Responsibility audits.
              </Text>
            </View>

            <Pressable style={styles.devBtn} onPress={onOpenDeveloper}>
              <Text style={styles.devBtnText}>
                DEVELOPER • codebynikko • DATA SAFETY &amp; EULA
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const VerdictKeyRow: React.FC<{ color: string; label: string; desc: string }> = ({
  color,
  label,
  desc,
}) => (
  <View style={styles.keyRow}>
    <View style={[styles.swatch, { backgroundColor: color }]} />
    <View style={styles.keyTextWrap}>
      <Text style={styles.keyLabel}>{label}</Text>
      <Text style={styles.keyDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
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
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {
    color: '#00C4FF',
    fontWeight: '800',
    fontSize: 16,
  },
  scroll: {
    gap: 12,
    paddingBottom: 26,
  },
  sectionLabel: {
    color: '#00C4FF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131820',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bullet: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  keyTextWrap: {
    flex: 1,
  },
  keyLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  keyDesc: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  tipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  acceptHead: {
    color: '#00FF88',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  rejectHead: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  devBtn: {
    marginTop: 6,
    backgroundColor: 'rgba(0,196,255,0.14)',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  devBtnText: {
    color: '#00C4FF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
