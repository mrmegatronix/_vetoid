import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PatronPublicPageProps {
  onOpenScanner?: () => void;
}

/**
 * Public Patron Information & NZ Privacy Act 2020 page.
 * Displayed when a patron scans the Venue Patron QR code (?patron=1).
 */
export const PatronPublicPage: React.FC<PatronPublicPageProps> = ({
  onOpenScanner,
}) => {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NEW ZEALAND LICENSED VENUE INFO</Text>
        </View>

        <Text style={styles.title}>About VetoID</Text>
        <Text style={styles.lead}>
          This venue uses VetoID to quickly verify that patrons are 18+ under the
          New Zealand Sale and Supply of Alcohol Act 2012.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>100% ZERO-PII PRIVACY GUARANTEE</Text>
          <Text style={styles.body}>
            • <Text style={styles.bold}>No Photos Saved:</Text> Your ID image is never stored or uploaded anywhere.{'\n'}
            • <Text style={styles.bold}>No Personal Details Stored:</Text> Your name, address, date of birth, and licence/passport number are immediately cleared from temporary memory.{'\n'}
            • <Text style={styles.bold}>Anonymous Venue Safety Tally:</Text> Only the scan time and anonymous pass/refusal count are logged for Host Responsibility compliance.{'\n'}
            • <Text style={styles.bold}>No Facial Recognition:</Text> VetoID does not use automated biometric or facial matching.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>APPROVED IDs IN NEW ZEALAND</Text>
          <Text style={styles.body}>
            Under NZ law, licensed venues can only accept a <Text style={styles.bold}>current (unexpired)</Text>:{'\n'}
            • New Zealand Driver Licence{'\n'}
            • Kiwi Access Card (or valid legacy HNZ 18+ Card){'\n'}
            • New Zealand or Overseas Passport{'\n'}
            • Accredited NZ Digital ID (DISTF Act 2023)
          </Text>
          <Text style={styles.warn}>
            Overseas driver licences, expired IDs, student IDs, and phone screenshots cannot be legally accepted in New Zealand.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>YOUR PRIVACY RIGHTS (PRIVACY ACT 2020)</Text>
          <Text style={styles.body}>
            • You may request a <Text style={styles.bold}>manual visual ID check</Text> at any time instead of an electronic scan (Information Privacy Principle 4).{'\n'}
            • Speak with the Duty Manager if you have any privacy questions.
          </Text>
        </View>

        {onOpenScanner && (
          <Pressable style={styles.staffBtn} onPress={onOpenScanner}>
            <Text style={styles.staffBtnText}>OPEN STAFF SCANNER</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    padding: 22,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,196,255,0.16)',
    borderWidth: 1,
    borderColor: '#00C4FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#00C4FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  lead: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#11161F',
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  body: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 23,
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  warn: {
    color: '#FFAB00',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
  staffBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  staffBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
