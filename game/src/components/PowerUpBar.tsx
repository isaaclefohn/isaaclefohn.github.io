/**
 * Power-up bar shown during gameplay.
 * Displays available power-ups with inventory counts.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PowerUpType, POWER_UP_CONFIGS } from '../game/powerups/PowerUpManager';
import { COLORS } from '../utils/constants';

interface PowerUpBarProps {
  inventory: Record<PowerUpType, number>;
  activePowerUp: PowerUpType | null;
  onActivate: (type: PowerUpType) => void;
  disabled?: boolean;
}

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  inventory,
  activePowerUp,
  onActivate,
  disabled = false,
}) => {
  const powerUps: PowerUpType[] = ['bomb', 'rowClear', 'colorClear'];

  return (
    <View style={styles.container}>
      {powerUps.map((type) => {
        const config = POWER_UP_CONFIGS[type];
        const count = inventory[type] ?? 0;
        const isActive = activePowerUp === type;

        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.powerUpButton,
              isActive && styles.activeButton,
              (count === 0 || disabled) && styles.disabledButton,
            ]}
            onPress={() => count > 0 && !disabled && onActivate(type)}
            disabled={count === 0 || disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>
              {type === 'bomb' ? '\uD83D\uDCA3' : type === 'rowClear' ? '\u2194\uFE0F' : '\uD83C\uDFA8'}
            </Text>
            <Text style={[styles.name, isActive && styles.activeName]}>
              {config.name}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  powerUpButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeButton: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}15`,
  },
  disabledButton: {
    opacity: 0.4,
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  name: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeName: {
    color: COLORS.accentGold,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
