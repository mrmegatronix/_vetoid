import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputKeyPressEvent,
  View,
} from 'react-native';

interface PinGateModalProps {
  visible: boolean;
  expectedPin: string;
  initialKeepUnlocked: boolean;
  title?: string;
  onSuccess: (keepUnlocked: boolean) => void;
  onCancel: () => void;
}

/**
 * Staff PIN gate implementing the pin-coded-access standard:
 * Segmented 48x56 cells matching expectedPin length, 10px gap, #00c4ff cyan focus/filled,
 * #00ff88 Verified success state, #ff6b6b error + 500ms shake animation.
 */
export const PinGateModal: React.FC<PinGateModalProps> = ({
  visible,
  expectedPin,
  initialKeepUnlocked,
  title = 'STAFF PIN ACCESS',
  onSuccess,
  onCancel,
}) => {
  const pinLength = Math.max(4, expectedPin.length);
  const [digits, setDigits] = useState<string[]>(Array(pinLength).fill(''));
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [keepUnlocked, setKeepUnlocked] = useState<boolean>(initialKeepUnlocked);
  const inputRefs = useRef<Array<React.ComponentRef<typeof TextInput> | null>>([]);
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDigits(Array(pinLength).fill(''));
      setStatus('idle');
      setStatusText('');
      setFocusedIdx(0);
      setKeepUnlocked(initialKeepUnlocked);
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    }
  }, [visible, pinLength, initialKeepUnlocked]);

  const runShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -2, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 7, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  };

  const validateCode = (code: string) => {
    if (code === expectedPin) {
      setStatus('success');
      setStatusText('Verified');
      setTimeout(() => {
        onSuccess(keepUnlocked);
      }, 380);
    } else {
      setStatus('error');
      setStatusText('Invalid code, try again');
      runShake();
      setTimeout(() => {
        setDigits(Array(pinLength).fill(''));
        setStatus('idle');
        setFocusedIdx(0);
        inputRefs.current[0]?.focus();
      }, 650);
    }
  };

  const handleChangeText = (index: number, raw: string) => {
    if (status === 'success') return;
    const cleaned = raw.replace(/\D/g, '');

    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      setStatus('idle');
      setStatusText('');
      return;
    }

    if (cleaned.length > 1) {
      const next = [...digits];
      const slice = cleaned.slice(0, pinLength - index);
      for (let i = 0; i < slice.length; i++) {
        next[index + i] = slice[i];
      }
      setDigits(next);
      setStatus('idle');
      setStatusText('');
      const lastFilled = Math.min(index + slice.length, pinLength - 1);
      inputRefs.current[lastFilled]?.focus();
      const joined = next.join('');
      if (joined.length === pinLength && !next.includes('')) {
        validateCode(joined);
      }
      return;
    }

    const next = [...digits];
    next[index] = cleaned[0];
    setDigits(next);
    setStatus('idle');
    setStatusText('');

    if (index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    const joined = next.join('');
    if (joined.length === pinLength && !next.includes('')) {
      validateCode(joined);
    }
  };

  const handleKeyPress = (index: number, e: TextInputKeyPressEvent) => {
    if (status === 'success') return;
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Enter {pinLength}-digit venue PIN</Text>

          <Animated.View
            style={[styles.cellRow, { transform: [{ translateX: shakeX }] }]}
            accessibilityLabel="One-time verification code"
          >
            {digits.map((digit, idx) => {
              const isFocused = focusedIdx === idx && status !== 'success';
              const isFilled = Boolean(digit);
              return (
                <TextInput
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  value={digit}
                  editable={status !== 'success'}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={pinLength}
                  selectTextOnFocus
                  secureTextEntry={false}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  selectionColor="#00C4FF"
                  accessibilityLabel={`Digit ${idx + 1}`}
                  onFocus={() => setFocusedIdx(idx)}
                  onChangeText={(txt) => handleChangeText(idx, txt)}
                  onKeyPress={(e) => handleKeyPress(idx, e)}
                  style={[
                    styles.cell,
                    isFilled && styles.cellFilled,
                    isFocused && styles.cellFocused,
                    status === 'success' && styles.cellSuccess,
                    status === 'error' && styles.cellError,
                  ]}
                />
              );
            })}
          </Animated.View>

          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.statusLine,
              status === 'success' && styles.statusSuccess,
              status === 'error' && styles.statusError,
            ]}
          >
            {statusText || ' '}
          </Text>

          {/* Keep Unlocked Quick Standby Toggle */}
          <View style={styles.standbyRow}>
            <View style={styles.standbyTextWrap}>
              <Text style={styles.standbyLabel}>Keep unlocked for quick standby</Text>
              <Text style={styles.standbySub}>Skip PIN during active shift</Text>
            </View>
            <Switch
              value={keepUnlocked}
              onValueChange={setKeepUnlocked}
              trackColor={{ false: '#374151', true: '#00C4FF' }}
            />
          </View>

          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0A0D12',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  cellRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cellFilled: {
    borderColor: 'rgba(0,196,255,0.55)',
    backgroundColor: 'rgba(0,196,255,0.08)',
  },
  cellFocused: {
    borderColor: '#00C4FF',
    backgroundColor: 'rgba(0,196,255,0.12)',
    shadowColor: '#00C4FF',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  cellSuccess: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0,255,136,0.12)',
    color: '#00FF88',
  },
  cellError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255,107,107,0.14)',
    color: '#FF6B6B',
  },
  statusLine: {
    minHeight: 18,
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  statusSuccess: {
    color: '#00FF88',
  },
  statusError: {
    color: '#FF6B6B',
  },
  standbyRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131820',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  standbyTextWrap: {
    flex: 1,
  },
  standbyLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  standbySub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 1,
  },
  cancelBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.8,
  },
});
