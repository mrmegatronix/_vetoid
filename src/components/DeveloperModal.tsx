import React from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DeveloperModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRIVACY_URL = 'https://mrmegatronix.github.io/_vetoid/privacy.html';
const REPO_URL = 'https://github.com/mrmegatronix/_vetoid';

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>DEVELOPER &amp; LEGAL</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>DONE</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {/* codebynikko Brand Banner */}
            <View style={styles.logoCard}>
              <Image
                source={require('../../assets/codebynikko-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.tagline}>
                VetoID™ v2.0.1 • Built in Aotearoa New Zealand
              </Text>
              <Text style={styles.copyright}>
                © 2026 codebynikko. All rights reserved.
              </Text>
            </View>

            {/* Data Safety Declaration */}
            <Text style={styles.sectionLabel}>DATA SAFETY &amp; PRIVACY DECLARATION</Text>
            <View style={styles.card}>
              <Text style={styles.body}>
                • <Text style={styles.bold}>Zero Patron PII Collected:</Text> VetoID does not collect, store, sell, or transmit patron names, photos, addresses, dates of birth, or ID numbers.{'\n'}
                • <Text style={styles.bold}>100% On-Device Processing:</Text> Camera frames, OCR text, MRZ check digits, and DISTF Digital ID QR checks run exclusively in volatile device RAM and are cleared immediately.{'\n'}
                • <Text style={styles.bold}>No Biometrics or Tracking:</Text> Zero facial recognition, zero advertising SDKs, and zero third-party analytics.{'\n'}
                • <Text style={styles.bold}>Local Venue Audit Logs:</Text> Only anonymous shift totals and SHA-256 hash-chained timestamps remain on-device for NZ Police / DLC compliance.
              </Text>
            </View>

            {/* User Agreement / EULA */}
            <Text style={styles.sectionLabel}>END USER LICENSE AGREEMENT (EULA)</Text>
            <View style={styles.card}>
              <Text style={styles.body}>
                1. <Text style={styles.bold}>License Grant:</Text> codebynikko grants a non-exclusive, revocable license to use VetoID for lawful age-verification assistance in licensed hospitality venues.{'\n'}
                2. <Text style={styles.bold}>Statutory Responsibility:</Text> Under the New Zealand Sale and Supply of Alcohol Act 2012, final legal responsibility for verifying patron age, physical ID authenticity, and likeness rests solely with the licensee, Duty Manager, and staff.{'\n'}
                3. <Text style={styles.bold}>Trespass Register Compliance:</Text> Any venue using the optional local Trespass Register is solely responsible for ensuring notices comply with the NZ Trespass Act 1980 and Privacy Act 2020.{'\n'}
                4. <Text style={styles.bold}>As-Is Warranty:</Text> Software is provided &ldquo;as is&rdquo; without warranty of uninterrupted operation or counterfeit detection; physical inspection remains mandatory.
              </Text>
            </View>

            {/* External Links */}
            <View style={styles.linkRow}>
              <Pressable
                style={styles.linkBtn}
                onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
              >
                <Text style={styles.linkBtnText}>PRIVACY POLICY</Text>
              </Pressable>
              <Pressable
                style={styles.linkBtnSecondary}
                onPress={() => Linking.openURL(REPO_URL).catch(() => {})}
              >
                <Text style={styles.linkBtnSecText}>SUPPORT / GITHUB</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
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
    paddingBottom: 28,
  },
  logoCard: {
    backgroundColor: '#0D121B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,196,255,0.28)',
  },
  logoImage: {
    width: '100%',
    height: 92,
  },
  tagline: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  copyright: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#00C4FF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131820',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  body: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  linkBtn: {
    flex: 1,
    backgroundColor: '#00C4FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  linkBtnSecondary: {
    flex: 1,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkBtnSecText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
