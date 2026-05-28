/**
 * Monthly login calendar modal.
 * Shows a 28-day grid with daily rewards.
 * Players claim the next available day each login.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getLoginCalendar, getNextClaimableDay, getCurrentMonthId, CalendarDay } from '../game/rewards/LoginCalendar';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface LoginCalendarModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LoginCalendarModal: React.FC<LoginCalendarModalProps> = ({ visible, onClose }) => {
  const { calendarLastDay, calendarMonth, claimCalendarDayAtomic } = usePlayerStore();

  const calendar = getLoginCalendar();
  const currentMonth = getCurrentMonthId();
  const effectiveDay = calendarMonth === currentMonth ? calendarLastDay : 0;
  const nextDay = getNextClaimableDay(effectiveDay, calendarMonth);
  const canClaim = nextDay > effectiveDay || calendarMonth !== currentMonth;

  const handleClaim = () => {
    const dayData = calendar[nextDay - 1];
    if (!dayData) return;

    // Atomic: stamp the day/month guard AND credit in one set().
    // Previously credits ran before the stamp, leaving a crash window
    // where the day's reward could be re-claimed.
    claimCalendarDayAtomic(nextDay, currentMonth, {
      coins: dayData.coins > 0 ? dayData.coins : undefined,
      gems: dayData.gems > 0 ? dayData.gems : undefined,
      ...(dayData.powerUp && dayData.powerUpCount
        ? { [dayData.powerUp]: dayData.powerUpCount }
        : {}),
    });
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Login Calendar</Text>
      <Text style={styles.subtitle}>Check in daily for rewards!</Text>

      <View style={{ width: '100%' }}>
        <ScrollView style={[styles.gridScroll, { width: '100%' }]} contentContainerStyle={styles.grid}>
          {calendar.map((day) => {
            const isClaimed = calendarMonth === currentMonth && day.day <= effectiveDay;
            const isNext = day.day === nextDay && canClaim;

            return (
              <View
                key={day.day}
                style={[
                  styles.dayCell,
                  isClaimed && styles.dayClaimed,
                  isNext && styles.dayNext,
                  day.isBigDay && styles.dayBig,
                  day.isGrandFinale && styles.dayFinale,
                ]}
              >
                <Text style={[styles.dayNumber, isClaimed && styles.dayNumberClaimed]}>
                  {day.day}
                </Text>
                {isClaimed ? (
                  <GameIcon name="check" size={14} color={COLORS.success} />
                ) : (
                  <View style={styles.dayReward}>
                    {day.gems > 0 ? (
                      <GameIcon name="gem" size={10} />
                    ) : (
                      <GameIcon name="coin" size={10} />
                    )}
                    <Text style={styles.dayRewardText}>
                      {day.gems > 0 ? day.gems : day.coins}
                    </Text>
                  </View>
                )}
                {day.powerUp && !isClaimed && (
                  <GameIcon
                    name={day.powerUp === 'bomb' ? 'bomb' : day.powerUp === 'rowClear' ? 'lightning' : 'palette'}
                    size={8}
                    color={COLORS.accent}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Claim section */}
        {canClaim && nextDay <= 28 && (
          <View style={styles.claimSection}>
            <Text style={styles.claimLabel}>Day {nextDay} Reward:</Text>
            <View style={styles.claimRewards}>
              <View style={styles.claimItem}>
                <GameIcon name="coin" size={14} />
                <Text style={styles.claimValue}>+{calendar[nextDay - 1].coins}</Text>
              </View>
              {calendar[nextDay - 1].gems > 0 && (
                <View style={styles.claimItem}>
                  <GameIcon name="gem" size={14} />
                  <Text style={styles.claimValue}>+{calendar[nextDay - 1].gems}</Text>
                </View>
              )}
            </View>
            <Button title="Claim Today" onPress={handleClaim} variant="primary" size="medium" />
          </View>
        )}

        {effectiveDay >= 28 && (
          <Text style={styles.completedText}>Calendar complete! Resets next month.</Text>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  gridScroll: {
    maxHeight: 260,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  dayCell: {
    width: 42,
    height: 48,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayClaimed: {
    backgroundColor: `${COLORS.success}15`,
    borderColor: `${COLORS.success}30`,
  },
  dayNext: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  dayBig: {
    backgroundColor: `${COLORS.accentGold}15`,
  },
  dayFinale: {
    backgroundColor: `${COLORS.accent}20`,
    borderColor: `${COLORS.accent}40`,
    borderWidth: 1,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  dayNumberClaimed: {
    color: COLORS.success,
  },
  dayReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dayRewardText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  claimSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  claimLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  claimRewards: {
    flexDirection: 'row',
    gap: 12,
  },
  claimItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claimValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    textAlign: 'center',
    marginTop: 12,
  },
});
