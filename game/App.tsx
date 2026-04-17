/**
 * Chroma Drop — Root App component.
 * Sets up gesture handler, navigation, ads SDK, and status bar.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandSplash } from './src/components/BrandSplash';
import { initializeAds } from './src/services/ads';
import { initSentry } from './src/services/analytics';
import { initializePurchases } from './src/services/purchases';

// Initialize Sentry as early as possible so startup errors are captured.
initSentry();

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initializeAds();
    initializePurchases();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <RootNavigator />
      {!splashDone && <BrandSplash onDone={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}
