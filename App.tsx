import React, { useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PatronPublicPage } from './src/components/PatronPublicPage';
import { ScannerScreen } from './src/components/ScannerScreen';

const NativeScreenCaptureGuard: React.FC = () => {
  // Enforce Android FLAG_SECURE & iOS screen-capture prevention (NZ Privacy Act 2020)
  usePreventScreenCapture();
  return null;
};

function isPatronInfoRoute(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('patron') === '1';
}

export default function App() {
  const [showPatronPage, setShowPatronPage] = useState<boolean>(isPatronInfoRoute);

  return (
    <SafeAreaProvider style={{ backgroundColor: '#000000' }}>
      {Platform.OS !== 'web' && <NativeScreenCaptureGuard />}
      <StatusBar style="light" />
      {showPatronPage ? (
        <PatronPublicPage onOpenScanner={() => setShowPatronPage(false)} />
      ) : (
        <ScannerScreen />
      )}
    </SafeAreaProvider>
  );
}
