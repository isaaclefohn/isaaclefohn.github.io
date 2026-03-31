/**
 * Settings screen with sound, haptics, and visual toggles.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { usePlayerStore } from '../store/playerStore';
import { Button } from '../components/common/Button';
import { COLORS } from '../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const settings = useSettingsStore();
  const player = usePlayerStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Audio section */}
        <Text style={styles.sectionTitle}>Audio</Text>
        <View style={styles.section}>
          <SettingRow
            label="Sound Effects"
            value={settings.soundEnabled}
            onToggle={settings.toggleSound}
          />
          <SettingRow
            label="Music"
            value={settings.musicEnabled}
            onToggle={settings.toggleMusic}
          />
          <SettingRow
            label="Haptic Feedback"
            value={settings.hapticsEnabled}
            onToggle={settings.toggleHaptics}
          />
        </View>

        {/* Visual section */}
        <Text style={styles.sectionTitle}>Visual</Text>
        <View style={styles.section}>
          <SettingRow
            label="Grid Lines"
            value={settings.showGridLines}
            onToggle={settings.toggleGridLines}
          />
          <SettingRow
            label="Ghost Preview"
            value={settings.showGhostPreview}
            onToggle={settings.toggleGhostPreview}
          />
        </View>

        {/* Player info */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{player.displayName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Highest Level</Text>
            <Text style={styles.infoValue}>{player.highestLevel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Streak</Text>
            <Text style={styles.infoValue}>{player.currentStreak} days</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Longest Streak</Text>
            <Text style={styles.infoValue}>{player.longestStreak} days</Text>
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>Block Blitz v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const SettingRow: React.FC<{
  label: string;
  value: boolean;
  onToggle: () => void;
}> = ({ label, value, onToggle }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: COLORS.gridEmpty, true: COLORS.accent }}
      thumbColor={COLORS.textPrimary}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gridEmpty,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gridEmpty,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 32,
  },
});
