/**
 * Premium power-up bar with pulse animations and activation effects.
 * Uses custom GameIcon instead of emojis.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native';
import { PowerUpType, POWER_UP_CONFIGS } from '../game/powerups/PowerUpManager';
import { GameIcon, IconName } from './GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';

interface PowerUpBarProps {
  inventory: Record<PowerUpType, number>;
  activePowerUp: PowerUpType | null;
  onActivate: (type: PowerUpType) => void;
  disabled?: boolean;
}

const POWER_UP_ICON_NAMES: Record<PowerUpType, IconName> = {
  bomb: 'bomb',
  rowClear: 'lightning',
  colorClear: 'palette',
};

const PowerUpButton: React.FC<{
  type: PowerUpType;
  count: number;
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({ type, count, isActive, disabled, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [isActive, pulseAnim, glowAnim]);

  const config = POWER_UP_CONFIGS[type];

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[
          styles.powerUpButton,
          isActive && styles.activeButton,
          (count === 0 || disabled) && styles.disabledButton,
        ]}
        onPress={onPress}
        disabled={count === 0 || disabled}
        activeOpacity={0.7}
      >
        <GameIcon name={POWER_UP_ICON_NAMES[type]} size={22} />
        <Text style={[styles.name, isActive && styles.activeName]}>
          {config.name}
        </Text>
        {count > 0 && (
          <View style={[styles.countBadge, isActive && styles.activeBadge]}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  inventory,
  activePowerUp,
  onActivate,
  disabled = false,
}) => {
  const powerUps: PowerUpType[] = ['bomb', 'rowClear', 'colorClear'];

  return (
    <View style={styles.container}>
      {powerUps.map((type) => (
        <PowerUpButton
          key={type}
          type={type}
          count={inventory[type] ?? 0}
          isActive={activePowerUp === type}
          disabled={disabled}
          onPress={() => onActivate(type)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  powerUpButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 74,
    gap: 3,
    ...SHADOWS.small,
  },
  activeButton: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}15`,
    shadowColor: COLORS.accentGold,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  disabledButton: {
    opacity: 0.35,
  },
  name: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  activeName: {
    color: COLORS.accentGold,
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.accent,
    borderRadius: RADII.round,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    ...SHADOWS.small,
  },
  activeBadge: {
    backgroundColor: COLORS.accentGold,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
