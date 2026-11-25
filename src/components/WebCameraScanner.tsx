import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export interface WebCameraScannerHandle {
  scanFrame: () => Promise<{ text: string; error?: string }>;
}

interface WebCameraScannerProps {
  active: boolean;
  torchOn: boolean;
  onStatusChange?: (status: string) => void;
}

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};

export const WebCameraScanner = forwardRef<
  WebCameraScannerHandle,
  WebCameraScannerProps
>(({ active, torchOn, onStatusChange }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<TesseractWorker | null>(null);
  const [camState, setCamState] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCamState('error');
      setErrorMsg('Camera API requires HTTPS or localhost.');
      return;
    }

    setCamState('starting');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamState('live');
    } catch (err) {
      setCamState('error');
      const msg =
        err instanceof Error ? err.message : 'Camera permission denied.';
      setErrorMsg(msg);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (active) {
      startCamera();
    } else {
      stopCamera();
      setCamState('idle');
    }
    return () => {
      stopCamera();
    };
  }, [active, startCamera, stopCamera]);

  // Apply Web Torch constraint on supported mobile browsers (e.g. Android Chrome)
  useEffect(() => {
    if (Platform.OS !== 'web' || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') return;
    const capabilities =
      typeof track.getCapabilities === 'function'
        ? (track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean })
        : {};
    if (capabilities.torch) {
      track
        .applyConstraints({
          advanced: [{ torch: torchOn } as MediaTrackConstraintSet],
        })
        .catch(() => {});
    }
  }, [torchOn, camState]);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate().catch(() => {});
      workerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scanFrame: async () => {
        if (Platform.OS !== 'web') {
          return { text: '', error: 'Web scanner unavailable.' };
        }
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth) {
          return { text: '', error: 'Camera not ready — tap ENABLE CAMERA first.' };
        }

        const canvas = document.createElement('canvas');
        // Crop center ID-1 reticle area (88% width, 1.586 aspect) for sharper OCR
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cropW = Math.round(vw * 0.92);
        const cropH = Math.min(vh, Math.round(cropW / 1.45));
        const sx = Math.round((vw - cropW) / 2);
        const sy = Math.round((vh - cropH) / 2);

        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          return { text: '', error: 'Unable to capture frame buffer.' };
        }

        // Draw frame & apply mild grayscale + contrast boost for laminated NZ IDs
        ctx.filter = 'grayscale(100%) contrast(145%)';
        ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

        try {
          if (!workerRef.current) {
            onStatusChange?.('LOADING ON-DEVICE OCR...');
            const { createWorker } = await import('tesseract.js');
            workerRef.current = (await createWorker('eng')) as unknown as TesseractWorker;
          }
          onStatusChange?.('READING ID IN RAM...');
          const { data } = await workerRef.current.recognize(canvas);
          return { text: data.text ?? '' };
        } catch (err) {
          return {
            text: '',
            error: err instanceof Error ? err.message : 'OCR scan failed.',
          };
        } finally {
          // Zero-retention RAM hygiene: immediately clear canvas buffer
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = 0;
          canvas.height = 0;
        }
      },
    }),
    [onStatusChange]
  );

  if (Platform.OS !== 'web') return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Live HTML5 Video Stream */}
      {React.createElement('video', {
        ref: videoRef,
        playsInline: true,
        muted: true,
        autoPlay: true,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000000',
        },
      })}

      {camState !== 'live' && (
        <View style={styles.overlay}>
          <Text style={styles.title}>
            {camState === 'starting'
              ? 'STARTING CAMERA...'
              : 'CAMERA PERMISSION REQUIRED'}
          </Text>
          <Text style={styles.sub}>
            {errorMsg ||
              'VetoID runs OCR 100% on-device in RAM. Zero photos leave your browser.'}
          </Text>
          {camState !== 'starting' && (
            <Pressable style={styles.btn} onPress={startCamera}>
              <Text style={styles.btnText}>ENABLE CAMERA</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

WebCameraScanner.displayName = 'WebCameraScanner';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,13,18,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  sub: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  btn: {
    marginTop: 6,
    backgroundColor: '#00C4FF',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  btnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
  },
});
