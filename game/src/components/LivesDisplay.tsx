/**
 * Lives/Energy display component.
 * Shows heart icons for remaining lives with regen timer.
 * Compact design for the home screen header area.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  calculateLives,
  formatLifeTimer,
  MAX_LIVES,
} from '../game/systems/EnergySystem';
import { GameIcon } from './GameIcon';
import { COLORS, RADII } from '../utils/constants';

export const LivesDisplay: React.FC = () => {
  const { lives: storedLives, lastLifeLostAt, infiniteLivesUntil } = usePlayerStore();
  const [liveState, setLiveState] = useState(() =>
    calculateLives(storedLives, lastLifeLostAt, infiniteLivesUntil)
  );

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveState(calculateLives(storedLives, lastLifeLostAt, infiniteLivesUntil));
    }, 1000);
    return () => clearInterval(interval);
  }, [storedLives, lastLifeLostAt, infiniteLivesUntil]);

  return (
    <View style={styles.container}>
      {liveState.isInfinite ? (
        <View style={styles.infiniteBadge}>
          <GameIcon name="sparkle" size={14} color={COLORS.accentGold} />
          <Text style={styles.infiniteText}>Unlimited</Text>
        </View>
      ) : (
        <>
          <View style={styles.heartsRow}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heart,
                  i >= liveState.lives && styles.heartEmpty,
                ]}
              >
                <Text style={[styles.heartIcon, i >= liveState.lives && styles.heartIconEmpty]}>
                  {i < liveState.lives ? '\u2764' : '\u2661'}
                </Text>
              </View>
            ))}
          </View>
          {liveState.nextLifeIn !== null && (
            <Text style={styles.timer}>{formatLifeTimer(liveState.nextLifeIn)}</Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  heart: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmpty: {
    opacity: 0.3,
  },
  heartIcon: {
    fontSize: 12,
    color: COLORS.accent,
  },
  heartIconEmpty: {
    color: COLORS.textMuted,
  },
  timer: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  infiniteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.accentGold}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.round,
  },
  infiniteText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 0.5,
  },
});
