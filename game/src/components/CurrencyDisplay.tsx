/**
 * Premium currency display with custom icons and compact formatting.
 *
 * Each chip emits a floating "+N" delta on increase via [[CurrencyDelta]].
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';
import { formatCompact } from '../utils/formatters';
import { FloatingDelta, useIncreaseDelta } from './CurrencyDelta';

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

  const coinDelta = useIncreaseDelta(coins);
  const gemDelta = useIncreaseDelta(gems);

  return (
    <View style={styles.container}>
      <View style={styles.currencyItem}>
        <GameIcon name="coin" size={14} />
        <Text style={styles.value}>{formatCompact(coins)}</Text>
        {coinDelta.seq > 0 && (
          <FloatingDelta
            key={`coin-${coinDelta.seq}`}
            amount={coinDelta.delta}
            color={COLORS.accentGold}
          />
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.currencyItem}>
        <GameIcon name="gem" size={14} />
        <Text style={[styles.value, styles.gemValue]}>{formatCompact(gems)}</Text>
        {gemDelta.seq > 0 && (
          <FloatingDelta
            key={`gem-${gemDelta.seq}`}
            amount={gemDelta.delta}
            color="#C084FC"
          />
        )}
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
    gap: 4,
    position: 'relative',
  },
  delta: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  gemValue: {
    color: '#C084FC',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.surfaceBorder,
  },
});
