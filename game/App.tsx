/**
 * Chroma Drop — Root App component.
 * Sets up gesture handler, navigation, ads SDK, and status bar.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandSplash } from './src/components/BrandSplash';
import { AchievementUnlockToast } from './src/components/AchievementUnlockToast';
import { initializeAds } from './src/services/ads';
import { initSentry, initAnalytics } from './src/services/analytics';
import { initializePurchases } from './src/services/purchases';
import { ensureSession } from './src/services/auth';
import { recordSessionStart } from './src/services/appRating';

// Initialize Sentry as early as possible so startup errors are captured.
initSentry();

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initAnalytics();
    initializeAds();
    initializePurchases();
    // Establish an (anonymous) session so leaderboard submits have a JWT.
    // Fire-and-forget: no-ops when Supabase/anon-auth isn't available.
    void ensureSession();
    // Count this app-open session. The Chapter 1 rating-prompt gate
    // requires ≥2 sessions so a brand-new player who happens to clear
    // level 30 on their very first sitting does not get a prompt
    // before they have come back. (Per the 2026-06 growth plan.)
    void recordSessionStart();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <RootNavigator />
      {/* Mounted once at App level so any screen's checkAchievements()
          call can surface a toast. Component drains the queue itself. */}
      <AchievementUnlockToast />
      {!splashDone && <BrandSplash onDone={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}
