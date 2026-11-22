import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScannerScreen } from './src/components/ScannerScreen';

const NativeScreenCaptureGuard: React.FC = () => {
  // Enforce Android FLAG_SECURE & iOS screen-capture prevention (NZ Privacy Act 2020)
  usePreventScreenCapture();
  return null;
};

export default function App() {
  return (
    <SafeAreaProvider>
      {Platform.OS !== 'web' && <NativeScreenCaptureGuard />}
      <StatusBar style="light" />
      <ScannerScreen />
    </SafeAreaProvider>
  );
}
