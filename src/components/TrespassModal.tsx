import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getDefaultTrespassExpiryNz,
  isTrespassRecordActive,
  TrespassRecord,
} from '../storage/trespassStore';
import { StaffRole } from '../types/verification';

interface TrespassModalProps {
  visible: boolean;
  records: TrespassRecord[];
  staffRole: StaffRole;
  onAddRecord: (input: {
    displayName: string;
    idNumberRef?: string;
    dobDisplay?: string;
    reason: string;
    expiresDateDisplay?: string;
    issuedByRole: StaffRole;
  }) => Promise<void>;
  onRemoveRecord: (id: string) => Promise<void>;
  onClose: () => void;
}

export const TrespassModal: React.FC<TrespassModalProps> = ({
  visible,
  records,
  staffRole,
  onAddRecord,
  onRemoveRecord,
  onClose,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [idNumberRef, setIdNumberRef] = useState('');
  const [dobDisplay, setDobDisplay] = useState('');
  const [reason, setReason] = useState('');
  const [expiresDate, setExpiresDate] = useState(getDefaultTrespassExpiryNz());
  const [formError, setFormError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim() && !idNumberRef.trim()) {
      setFormError('Enter patron name or ID reference (e.g. AB123456).');
      return;
    }
    setFormError('');
    await onAddRecord({
      displayName: displayName.trim() || idNumberRef.trim().toUpperCase(),
      idNumberRef: idNumberRef.trim(),
      dobDisplay: dobDisplay.trim(),
      reason: reason.trim() || 'Trespassed from licensed premises',
      expiresDateDisplay: expiresDate.trim() || getDefaultTrespassExpiryNz(),
      issuedByRole: staffRole,
    });
    setDisplayName('');
    setIdNumberRef('');
    setDobDisplay('');
    setReason('');
    setExpiresDate(getDefaultTrespassExpiryNz());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>TRESPASSED PATRONS</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>DONE</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.legalNote}>
              NZ Trespass Act 1980: Notices remain active up to 2 years. Stored locally
              on-device only. Alerts automatically when a matching ID is scanned.
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>RECORD NEW TRESPASS NOTICE</Text>
              <TextInput
                style={styles.input}
                placeholder="Patron Name (e.g. J. Smith)"
                placeholderTextColor="#6B7280"
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextInput
                style={styles.input}
                placeholder="ID Ref / Licence # (e.g. AB123456)"
                placeholderTextColor="#6B7280"
                autoCapitalize="characters"
                value={idNumberRef}
                onChangeText={setIdNumberRef}
              />
              <TextInput
                style={styles.input}
                placeholder="DOB (DD/MM/YYYY — optional)"
                placeholderTextColor="#6B7280"
                value={dobDisplay}
                onChangeText={setDobDisplay}
              />
              <TextInput
                style={styles.input}
                placeholder="Reason (e.g. Aggressive behaviour / Refused to leave)"
                placeholderTextColor="#6B7280"
                value={reason}
                onChangeText={setReason}
              />
              <TextInput
                style={styles.input}
                placeholder="Expiry Date (DD/MM/YYYY — default +2 yrs)"
                placeholderTextColor="#6B7280"
                value={expiresDate}
                onChangeText={setExpiresDate}
              />

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>ADD TO BANNED LIST</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>
              ACTIVE TRESPASS REGISTER ({records.length})
            </Text>

            {records.length === 0 ? (
              <Text style={styles.emptyText}>No trespassed patrons recorded.</Text>
            ) : (
              records.map((rec) => {
                const active = isTrespassRecordActive(rec);
                return (
                  <View
                    key={rec.id}
                    style={[styles.recCard, !active && styles.recExpired]}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.recName}>
                        {rec.displayName} {rec.idNumberRef ? `(${rec.idNumberRef})` : ''}
                      </Text>
                      <Text style={styles.recReason}>{rec.reason}</Text>
                      <Text style={styles.recMeta}>
                        Issued: {rec.issuedDateDisplay} • Expires: {rec.expiresDateDisplay} • By {rec.issuedByRole}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => onRemoveRecord(rec.id)}
                    >
                      <Text style={styles.removeBtnText}>REMOVE</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
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
    color: '#FF1744',
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
    fontSize: 16,
    fontWeight: '800',
  },
  scroll: {
    gap: 12,
    paddingBottom: 28,
  },
  legalNote: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: '#131820',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  input: {
    backgroundColor: '#0A0D12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 15,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  recCard: {
    backgroundColor: '#131820',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF1744',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recExpired: {
    opacity: 0.45,
    borderLeftColor: '#6B7280',
  },
  recName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  recReason: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },
  recMeta: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  removeBtn: {
    backgroundColor: 'rgba(255,107,107,0.16)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeBtnText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '800',
  },
});
