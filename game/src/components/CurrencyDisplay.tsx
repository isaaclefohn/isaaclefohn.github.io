/**
 * Currency display showing coins and gems in the header.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { COLORS } from '../utils/constants';
import { formatCompact } from '../utils/formatters';

export const CurrencyDisplay: React.FC = () => {
  const { coins, gems } = usePlayerStore();

  return (
    <View style={styles.container}>
      <View style={styles.currencyItem}>
        <Text style={styles.icon}>{'\uD83E\uDE99'}</Text>
        <Text style={styles.value}>{formatCompact(coins)}</Text>
      </View>
      <View style={styles.currencyItem}>
        <Text style={styles.icon}>{'\uD83D\uDC8E'}</Text>
        <Text style={styles.value}>{formatCompact(gems)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  icon: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
});
