/**
 * Settings screen with sound, haptics, and visual toggles.
 * Premium styled with animated entrance, profile avatar, and stats.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  ScrollView,
  Animated,
} from 'react-native';
import { Tutorial } from '../components/Tutorial';
import { GameIcon, IconName } from '../components/GameIcon';
import { useSettingsStore } from '../store/settingsStore';
import { usePlayerStore } from '../store/playerStore';
import { Button } from '../components/common/Button';
import { COLORS, SHADOWS, SPACING, RADII } from '../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const STAGGER_DELAY = 80;
const ENTRANCE_DURATION = 400;

function useStaggeredEntrance(count: number) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: ENTRANCE_DURATION,
        delay: i * STAGGER_DELAY,
        useNativeDriver: true,
      })
    );
    Animated.stagger(STAGGER_DELAY, animations).start();
  }, [anims]);

  return anims;
}

function animatedStyle(anim: Animated.Value) {
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const settings = useSettingsStore();
  const player = usePlayerStore();

  // 7 animated sections: header, profile, audio, visual, help, stats, footer
  const anims = useStaggeredEntrance(7);
  const [showTutorial, setShowTutorial] = useState(false);

  const initials = (player.displayName || 'P').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, animatedStyle(anims[0])]}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile section */}
        <Animated.View style={[styles.sectionCard, animatedStyle(anims[1])]}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{player.displayName}</Text>
              <Text style={styles.profileSub}>
                Level {player.highestLevel} {' \u2022 '} {player.currentStreak} day streak
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Audio section */}
        <Animated.View style={animatedStyle(anims[2])}>
          <Text style={styles.sectionTitle}>Audio</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="sound"
              label="Sound Effects"
              value={settings.soundEnabled}
              onToggle={settings.toggleSound}
            />
            <Divider />
            <SettingRow
              icon="music"
              label="Music"
              value={settings.musicEnabled}
              onToggle={settings.toggleMusic}
            />
            <Divider />
            <SettingRow
              icon="haptic"
              label="Haptic Feedback"
              value={settings.hapticsEnabled}
              onToggle={settings.toggleHaptics}
              last
            />
          </View>
        </Animated.View>

        {/* Visual section */}
        <Animated.View style={animatedStyle(anims[3])}>
          <Text style={styles.sectionTitle}>Visual</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="grid"
              label="Grid Lines"
              value={settings.showGridLines}
              onToggle={settings.toggleGridLines}
            />
            <Divider />
            <SettingRow
              icon="ghost"
              label="Ghost Preview"
              value={settings.showGhostPreview}
              onToggle={settings.toggleGhostPreview}
              last
            />
          </View>
        </Animated.View>

        {/* Help section */}
        <Animated.View style={animatedStyle(anims[4])}>
          <Text style={styles.sectionTitle}>Help</Text>
          <View style={styles.sectionCard}>
            <Button
              title="How to Play"
              onPress={() => setShowTutorial(true)}
              variant="ghost"
              size="medium"
            />
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View style={animatedStyle(anims[5])}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.sectionCard}>
            <View style={styles.statsRow}>
              <StatItem label="Total Score" value={formatNumber(player.totalScore)} />
              <StatDivider />
              <StatItem label="Lines" value={formatNumber(player.totalLinesCleared)} />
              <StatDivider />
              <StatItem label="Level" value={String(player.highestLevel)} />
              <StatDivider />
              <StatItem label="Best Streak" value={`${player.longestStreak}d`} />
            </View>
          </View>
        </Animated.View>

        {/* About footer */}
        <Animated.View style={[styles.footer, animatedStyle(anims[6])]}>
          <GameIcon name="gamepad" size={32} />
          <Text style={styles.footerAppName}>Color Block Blast</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
          <Text style={styles.footerCopy}>Made with care</Text>
        </Animated.View>
      </ScrollView>

      {showTutorial && <Tutorial onComplete={() => setShowTutorial(false)} />}
    </SafeAreaView>
  );
};

// --- Sub-components ---

const Divider: React.FC = () => <View style={styles.divider} />;

const StatDivider: React.FC = () => <View style={styles.statDivider} />;

const SettingRow: React.FC<{
  icon: IconName;
  label: string;
  value: boolean;
  onToggle: () => void;
  last?: boolean;
}> = ({ icon, label, value, onToggle }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLabelRow}>
      <View style={styles.settingIconWrap}>
        <GameIcon name={icon} size={18} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: COLORS.gridEmpty, true: COLORS.accent }}
      thumbColor={COLORS.textPrimary}
    />
  </View>
);

const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: RADII.round,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: SPACING.md,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.surfaceBorder,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: SPACING.md,
    gap: 4,
  },
  footerAppName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  footerVersion: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  footerCopy: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
