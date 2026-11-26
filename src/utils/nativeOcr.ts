import { Platform } from 'react-native';

/**
 * Runs 100% on-device Google ML Kit OCR on native Android/iOS camera captures.
 * Returns recognized raw text (caller must discard immediately after age/expiry/trespass check).
 */
export async function recognizeTextFromNativeImage(imageUri: string): Promise<string> {
  if (Platform.OS === 'web') return '';
  const mod = await import('@react-native-ml-kit/text-recognition');
  const TextRecognition = mod.default;
  const result = await TextRecognition.recognize(imageUri);
  return result?.text ?? '';
}
