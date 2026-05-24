/**
 * Root stack navigator for Chroma Drop.
 */

import React from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { trackScreen } from '../services/analytics';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { GameScreen } from '../screens/GameScreen';
import { LevelSelectScreen } from '../screens/LevelSelectScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { DailyChallengeScreen } from '../screens/DailyChallengeScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { BattlePassScreen } from '../screens/BattlePassScreen';
import { WeeklyChallengeScreen } from '../screens/WeeklyChallengeScreen';

export type RootStackParamList = {
  Home: undefined;
  Game: { level: number; endless?: boolean; daily?: boolean };
  LevelSelect: undefined;
  Settings: undefined;
  Shop: undefined;
  DailyChallenge: undefined;
  Leaderboard: undefined;
  BattlePass: undefined;
  WeeklyChallenge: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const routeNameRef = React.useRef<string | undefined>(undefined);
  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => {
        routeNameRef.current = navRef.getCurrentRoute()?.name;
        if (routeNameRef.current) trackScreen(routeNameRef.current);
      }}
      onStateChange={() => {
        const previous = routeNameRef.current;
        const current = navRef.getCurrentRoute()?.name;
        if (current && previous !== current) trackScreen(current);
        routeNameRef.current = current;
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#1a1a2e' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="BattlePass" component={BattlePassScreen} />
        <Stack.Screen name="WeeklyChallenge" component={WeeklyChallengeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
