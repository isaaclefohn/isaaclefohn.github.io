/**
 * Active-boost indicator pill(s).
 *
 * Closes the loop on the Daily Roulette's boost rewards: when the
 * player wins "Double Time" or "XP Surge", the multiplier is applied
 * inside the store but is otherwise invisible. Without this pill the
 * player gets mysteriously-doubled coin/XP credits with no on-screen
 * explanation — a clear cause/effect gap that hurts the perceived
 * value of the reward.
 *
 * Renders nothing when no boost is active, so it's safe to drop
 * anywhere in a screen header without taking layout space.
 *
 * The countdown ticks once per second via setInterval. We pick 1 s
 * rather than requestAnimationFrame because the displayed precision
 * is mm:ss — sub-second updates would burn battery for zero visible
 * benefit on a screen the player isn't watching frame-by-frame.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  boostRemainingMs,
  formatBoostRemaining,
  type BoostKind,
} from '../game/rewards/ActiveBoosts';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface PillProps {
  kind: BoostKind;
}

const PILL_META: Record<BoostKind, { label: string; icon: 'coin' | 'star'; color: string }> = {
  coins: { label: '2x Coins', icon: 'coin', color: COLORS.accentGold },
  xp: { label: '2x XP', icon: 'star', color: '#FACC15' },
};

const SinglePill: React.FC<PillProps> = ({ kind }) => {
  const activeBoostUntil = usePlayerStore((s) => s.activeBoostUntil);
  // Local clock that ticks once per second so the countdown text
  // updates without re-reading the store. The store value (the
  // expiration timestamp) only changes when a new boost is granted.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = boostRemainingMs(activeBoostUntil, kind, now);
  if (remaining <= 0) return null;

  const meta = PILL_META[kind];
  return (
    <View style={[styles.pill, { borderColor: meta.color }]}>
      <GameIcon name={meta.icon} size={12} color={meta.color} />
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
      <Text style={styles.countdown}>{formatBoostRemaining(remaining)}</Text>
    </View>
  );
};

/**
 * Row of pills for any active boosts. Mounts cheaply when none are
 * active (each SinglePill returns null), so callers can drop this in
 * a header without conditionally rendering it themselves.
 */
export const BoostPill: React.FC = () => {
  const activeBoostUntil = usePlayerStore((s) => s.activeBoostUntil);

  // Cheap selector: only show the row at all if at least one boost
  // field is set. The actual still-active check happens inside
  // SinglePill (handles the every-second tick).
  const anyPresent = useMemo(
    () => activeBoostUntil.coins !== undefined || activeBoostUntil.xp !== undefined,
    [activeBoostUntil.coins, activeBoostUntil.xp],
  );
  if (!anyPresent) return null;

  return (
    <View style={styles.row}>
      <SinglePill kind="coins" />
      <SinglePill kind="xp" />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.round,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  countdown: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
