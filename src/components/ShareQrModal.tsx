import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'qrcode';

export const SHARE_APP_URL = 'https://mrmegatronix.github.io/_vetoid/';
export const PATRON_INFO_URL = 'https://mrmegatronix.github.io/_vetoid/?patron=1';

interface ShareQrModalProps {
  visible: boolean;
  initialMode?: 'patron' | 'app';
  onClose: () => void;
}

/**
 * 100% offline QR matrix renderer with Patron Info QR & Staff App Share QR tabs.
 */
export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  visible,
  initialMode = 'patron',
  onClose,
}) => {
  const [mode, setMode] = useState<'patron' | 'app'>(initialMode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setCopied(false);
    }
  }, [visible, initialMode]);

  const activeUrl = mode === 'patron' ? PATRON_INFO_URL : SHARE_APP_URL;

  const matrix = useMemo(() => {
    const qr = QRCode.create(activeUrl, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    const rows: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.modules.get(r, c) === 1);
      }
      rows.push(row);
    }
    return { size, rows };
  }, [activeUrl]);

  const qrPx = 228;
  const cellSize = qrPx / matrix.size;

  const handleCopy = async () => {
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(activeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        return;
      }
      await Share.share({ message: `VetoID NZ 18+ Scanner: ${activeUrl}`, url: activeUrl });
    } catch {
      // Ignore cancel
    }
  };

  const handleShare = async () => {
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        typeof (navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> }).share === 'function'
      ) {
        await (
          navigator as Navigator & { share: (d: { title: string; url: string }) => Promise<void> }
        ).share({
          title: mode === 'patron' ? 'About VetoID (NZ Privacy Info)' : 'VetoID — NZ 18+ ID Scanner',
          url: activeUrl,
        });
        return;
      }
      await Share.share({
        title: 'VetoID — NZ 18+ ID Scanner',
        message: `VetoID: ${activeUrl}`,
        url: activeUrl,
      });
    } catch {
      // Ignore cancel
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'patron' ? 'PATRON PRIVACY QR' : 'SHARE VetoID APP'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>

          {/* Mode Switcher */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, mode === 'patron' && styles.tabBtnActive]}
              onPress={() => setMode('patron')}
            >
              <Text style={[styles.tabText, mode === 'patron' && styles.tabTextActive]}>
                PATRON INFO
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, mode === 'app' && styles.tabBtnActive]}
              onPress={() => setMode('app')}
            >
              <Text style={[styles.tabText, mode === 'app' && styles.tabTextActive]}>
                STAFF APP
              </Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            {mode === 'patron'
              ? 'Patrons can scan this QR to learn how VetoID protects their privacy under NZ law'
              : 'Scan to open VetoID on another staff phone'}
          </Text>

          {/* High-contrast white quiet zone */}
          <View style={styles.qrFrame}>
            <View style={{ width: qrPx, height: qrPx }}>
              {matrix.rows.map((row, rIdx) => (
                <View key={rIdx} style={{ flexDirection: 'row', height: cellSize }}>
                  {row.map((dark, cIdx) => (
                    <View
                      key={cIdx}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: dark ? '#000000' : '#FFFFFF',
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
            {activeUrl}
          </Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryBtn} onPress={handleCopy}>
              <Text style={styles.secondaryBtnText} numberOfLines={1}>
                {copied ? 'COPIED' : 'COPY LINK'}
              </Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleShare}>
              <Text style={styles.primaryBtnText} numberOfLines={1}>
                SHARE
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0A0D12',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    color: '#00C4FF',
    fontSize: 15,
    fontWeight: '800',
  },
  tabRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#131820',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#00C4FF',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#000000',
  },
  subtitle: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  urlText: {
    color: '#00C4FF',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '100%',
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#00C4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
});
