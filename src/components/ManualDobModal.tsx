import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { evaluateManualDob } from '../domain/nzIdParser';
import {
  getAllowedDobDigits,
  getDobStepLabel,
} from '../domain/smartDobKeypad';
import { VerificationResult } from '../types/verification';
import { playKeyTapSound } from '../utils/sounds';

interface ManualDobModalProps {
  visible: boolean;
  minimumAge: number;
  soundEnabled: boolean;
  onClose: () => void;
  onVerified: (result: VerificationResult) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

export const ManualDobModal: React.FC<ManualDobModalProps> = ({
  visible,
  minimumAge,
  soundEnabled,
  onClose,
  onVerified,
}) => {
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const allowedDigits = useMemo(() => getAllowedDobDigits(digits), [digits]);
  const stepLabel = useMemo(() => getDobStepLabel(digits), [digits]);

  const handleKey = (key: string) => {
    setErrorMsg('');
    if (key === 'CLR') {
      playKeyTapSound(soundEnabled);
      setDigits('');
      return;
    }
    if (key === 'DEL') {
      playKeyTapSound(soundEnabled);
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    if (digits.length >= 8 || !allowedDigits.has(key)) return;

    playKeyTapSound(soundEnabled);
    // Smart auto-complete: entering '1' at year pos 4 fills '19'; entering '2' fills '20'
    let next = digits + key;
    if (digits.length === 4) {
      next = key === '1' ? `${digits}19` : `${digits}20`;
    }
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
            <Text style={styles.title}>SMART DOB KEYPAD</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>
          <Text style={styles.stepPill}>{stepLabel}</Text>

          <View style={styles.displayBox}>
            <Text style={styles.displayText}>{formatted}</Text>
          </View>
          <Text style={styles.errorLine}>{errorMsg || ' '}</Text>

          <View style={styles.grid}>
            {KEYS.map((key) => {
              const isAction = key === 'CLR' || key === 'DEL';
              const isEnabled = isAction || allowedDigits.has(key);
              return (
                <Pressable
                  key={key}
                  disabled={!isEnabled}
                  style={[
                    styles.keyBtn,
                    isAction && styles.keySecondary,
                    !isEnabled && styles.keyDisabled,
                  ]}
                  onPress={() => handleKey(key)}
                >
                  <Text
                    style={[
                      styles.keyText,
                      !isEnabled && styles.keyTextDisabled,
                    ]}
                  >
                    {key}
                  </Text>
                </Pressable>
              );
            })}
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
    fontSize: 20,
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
    fontSize: 15,
  },
  stepPill: {
    color: '#00FF88',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  displayBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00C4FF',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 2,
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 32,
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
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#161B24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  keySecondary: {
    backgroundColor: '#1F2430',
  },
  keyDisabled: {
    backgroundColor: '#0C0F14',
    borderColor: 'rgba(255,255,255,0.04)',
    opacity: 0.25,
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  keyTextDisabled: {
    color: '#6B7280',
  },
});
