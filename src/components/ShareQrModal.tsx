import React, { useMemo, useState } from 'react';
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

interface ShareQrModalProps {
  visible: boolean;
  url?: string;
  onClose: () => void;
}

/**
 * 100% offline QR matrix renderer (zero external API calls, works on iOS/Android/Web).
 */
export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  visible,
  url = SHARE_APP_URL,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const matrix = useMemo(() => {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
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
  }, [url]);

  const qrPx = 224;
  const cellSize = qrPx / matrix.size;

  const handleCopy = async () => {
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        return;
      }
      await Share.share({ message: `VetoID NZ 18+ Scanner: ${url}`, url });
    } catch {
      // Ignore user cancel
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
        ).share({ title: 'VetoID — NZ 18+ ID Scanner', url });
        return;
      }
      await Share.share({
        title: 'VetoID — NZ 18+ ID Scanner',
        message: `VetoID NZ 18+ ID Scanner: ${url}`,
        url,
      });
    } catch {
      // Ignore user cancel
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>SHARE VetoID</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Scan to open VetoID on another device
          </Text>

          {/* High-contrast white quiet zone for reliable low-light scanning */}
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
            {url}
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
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0A0D12',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  header: {
    width: '100%',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    color: '#00C4FF',
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  urlText: {
    color: '#00C4FF',
    fontSize: 12,
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
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#00C4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
});
