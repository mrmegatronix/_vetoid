import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { evaluateManualDob } from '../domain/nzIdParser';
import { VerificationResult } from '../types/verification';

interface ManualDobModalProps {
  visible: boolean;
  minimumAge: number;
  onClose: () => void;
  onVerified: (result: VerificationResult) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

export const ManualDobModal: React.FC<ManualDobModalProps> = ({
  visible,
  minimumAge,
  onClose,
  onVerified,
}) => {
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleKey = (key: string) => {
    setErrorMsg('');
    if (key === 'CLR') {
      setDigits('');
      return;
    }
    if (key === 'DEL') {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    if (digits.length >= 8) return;
    const next = digits + key;
    setDigits(next);

    if (next.length === 8) {
      const day = Number(next.slice(0, 2));
      const month = Number(next.slice(2, 4));
      const year = Number(next.slice(4, 8));
      const res = evaluateManualDob(day, month, year, undefined, minimumAge);
      if (!res) {
        setErrorMsg('Invalid date — enter DD/MM/YYYY');
        return;
      }
      setDigits('');
      onVerified(res);
    }
  };

  const formatted = [
    digits.slice(0, 2).padEnd(2, 'D'),
    digits.slice(2, 4).padEnd(2, 'M'),
    digits.slice(4, 8).padEnd(4, 'Y'),
  ].join(' / ');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>MANUAL DOB CHECK</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            IPP 4 Visual Bypass &amp; Worn-Card Fallback (Zero Data Stored)
          </Text>

          <View style={styles.displayBox}>
            <Text style={styles.displayText}>{formatted}</Text>
          </View>
          <Text style={styles.errorLine}>{errorMsg || ' '}</Text>

          <View style={styles.grid}>
            {KEYS.map((key) => (
              <Pressable
                key={key}
                style={[
                  styles.keyBtn,
                  (key === 'CLR' || key === 'DEL') && styles.keySecondary,
                ]}
                onPress={() => handleKey(key)}
              >
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0A0D12',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 20,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeText: {
    color: '#00C4FF',
    fontWeight: '800',
    fontSize: 14,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  displayBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00C4FF',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  errorLine: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  keyBtn: {
    width: '31%',
    minHeight: 62,
    borderRadius: 12,
    backgroundColor: '#161B24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  keySecondary: {
    backgroundColor: '#1F2430',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
