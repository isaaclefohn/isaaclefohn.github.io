/**
 * Premium currency display with icons and compact formatting.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { COLORS, RADII, SPACING } from '../utils/constants';
import { formatCompact } from '../utils/formatters';

interface CurrencyDisplayProps {
  coins?: number;
  gems?: number;
  compact?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  coins: coinsProp,
  gems: gemsProp,
  compact = false,
}) => {
  const store = usePlayerStore();
  const coins = coinsProp ?? store.coins;
  const gems = gemsProp ?? store.gems;

  return (
    <View style={styles.container}>
      <View style={styles.currencyItem}>
        <Text style={styles.icon}>🪙</Text>
        <Text style={styles.value}>{formatCompact(coins)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.currencyItem}>
        <Text style={styles.icon}>💎</Text>
        <Text style={styles.value}>{formatCompact(gems)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 8,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  icon: {
    fontSize: 14,
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.surfaceBorder,
  },
});
