/**
 * Daily reward calendar modal.
 * Shows a 7-day reward track with escalating prizes.
 * Appears on first open each day if reward is available.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { DAILY_REWARDS, usePlayerStore } from '../store/playerStore';
import { getDailyTiles, type WheelTile } from '../game/engine/dailyWheel';
import { scheduleDailyRewardReminder } from '../services/notifications';
import { canShowRewarded, showRewardedAd } from '../services/ads';
import { TouchableOpacity } from 'react-native';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

interface DailyRewardModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ visible, onClose }) => {
  const {
    dailyRewardDay,
    dailyRewardLastClaimed,
    claimDailyReward,
    canClaimDailyWheelRespin,
    rewardDailyWheelRespin,
  } = usePlayerStore();
  const bounceAnim = useRef(new Animated.Value(0.8)).current;

  const today = new Date().toISOString().split('T')[0];
  const canClaim = dailyRewardLastClaimed !== today;
  const currentDayIndex = dailyRewardDay % DAILY_REWARDS.length;

  // Wheel state — read tiles directly so the player sees them BEFORE the spin
  // (anticipation = the dopamine moment, per the variable-reward research).
  const wheelTiles = useMemo(() => getDailyTiles(dailyRewardDay), [dailyRewardDay]);
  const [spinPhase, setSpinPhase] = useState<'idle' | 'spinning' | 'settled'>('idle');
  const [spinIndex, setSpinIndex] = useState<number | null>(null);
  const [wonTile, setWonTile] = useState<WheelTile | null>(null);

  useEffect(() => {
    if (visible && canClaim) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0.95, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, canClaim]);

  // Reset wheel state whenever the modal is hidden so the next open starts
  // fresh (otherwise a re-open would show stale "settled" state).
  useEffect(() => {
    if (!visible) {
      setSpinPhase('idle');
      setSpinIndex(null);
      setWonTile(null);
    }
  }, [visible]);

  const handleClaim = () => {
    const result = claimDailyReward();
    if (!result) return;
    // The reward is credited immediately in the store; we now animate the
    // wheel to the winning index. Decelerating step durations make it feel
    // like a real wheel slowing to a stop (instead of a flat strobe).
    const targetIndex = result.wheel.index;
    const stepDurations = [55, 55, 55, 60, 70, 90, 120, 170, 240];
    let step = 0;
    setSpinPhase('spinning');

    const tick = () => {
      if (step < stepDurations.length) {
        setSpinIndex(step % 4);
        const dur = stepDurations[step];
        step++;
        setTimeout(tick, dur);
      } else {
        // Settle on the actual winning slot — this is the dopamine moment.
        setSpinIndex(targetIndex);
        setWonTile(result.wheel.tile);
        setSpinPhase('settled');
        scheduleDailyRewardReminder().catch(() => {});
      }
    };
    tick();
  };

  /** Re-spin after watching a rewarded ad. Only available once per day,
   *  AFTER the natural reward arc has fired (per the dopamine-arc rule
   *  in the 2026-06 monetization plan — never interrupt or precede
   *  variable rewards with an ad). Runs the same spin animation +
   *  settle sequence as the original claim. */
  const [respinAdInFlight, setRespinAdInFlight] = useState(false);
  const handleRespin = async () => {
    if (respinAdInFlight || !canShowRewarded()) return;
    setRespinAdInFlight(true);
    let earned = false;
    try {
      earned = await showRewardedAd();
    } finally {
      setRespinAdInFlight(false);
    }
    if (!earned) return;
    const result = rewardDailyWheelRespin();
    if (!result) return;
    // Reset to spinning phase so the wheel re-runs its decelerating
    // staircase from the top — players who paid an ad get the full
    // dopamine arc, not a snap.
    const targetIndex = result.index;
    const stepDurations = [55, 55, 55, 60, 70, 90, 120, 170, 240];
    let step = 0;
    setSpinPhase('spinning');
    setWonTile(null);
    const tick = () => {
      if (step < stepDurations.length) {
        setSpinIndex(step % 4);
        const dur = stepDurations[step];
        step++;
        setTimeout(tick, dur);
      } else {
        setSpinIndex(targetIndex);
        setWonTile(result.tile);
        setSpinPhase('settled');
      }
    };
    tick();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <GameIcon name="calendar" size={32} color={COLORS.accentGold} />
        <Text style={styles.title}>Daily Rewards</Text>
        <Text style={styles.subtitle}>Day {dailyRewardDay + 1} of 7</Text>
      </View>

      <View style={styles.grid}>
        {DAILY_REWARDS.map((reward, i) => {
          const isCurrent = i === currentDayIndex && canClaim;
          const isClaimed = i < currentDayIndex || (i === currentDayIndex && !canClaim);

          return (
            <Animated.View
              key={i}
              style={[
                styles.dayCard,
                isClaimed && styles.dayCardClaimed,
                isCurrent && styles.dayCardCurrent,
                isCurrent ? { transform: [{ scale: bounceAnim }] } : undefined,
              ]}
            >
              <Text style={[styles.dayLabel, isClaimed && styles.dayLabelClaimed]}>
                Day {i + 1}
              </Text>
              <GameIcon
                name={reward.gems ? 'gem' : reward.powerUp ? 'bomb' : 'coin'}
                size={20}
                color={isClaimed ? COLORS.textMuted : COLORS.accentGold}
              />
              <Text style={[styles.dayReward, isClaimed && styles.dayRewardClaimed]}>
                {reward.coins}
              </Text>
              {reward.gems && (
                <Text style={styles.dayBonus}>+{reward.gems} gems</Text>
              )}
              {isClaimed && (
                <View style={styles.claimedBadge}>
                  <GameIcon name="check" size={12} color={COLORS.success} />
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>

      {(canClaim || spinPhase !== 'idle') && (
        <View style={styles.wheelSection}>
          <Text style={styles.wheelTitle}>Bonus Spin</Text>
          <View style={styles.wheelRow}>
            {wheelTiles.map((tile, i) => {
              const isHighlighted = spinIndex === i;
              const isWinner = spinPhase === 'settled' && spinIndex === i;
              const isRare = tile.rarity === 'rare';
              return (
                <View
                  key={i}
                  style={[
                    styles.wheelTile,
                    isRare && styles.wheelTileRare,
                    isHighlighted && spinPhase === 'spinning' && styles.wheelTileSpinning,
                    isWinner && styles.wheelTileWinner,
                  ]}
                >
                  <Text style={[styles.wheelTileLabel, isRare && styles.wheelTileLabelRare]}>
                    {tile.label}
                  </Text>
                </View>
              );
            })}
          </View>
          {spinPhase === 'settled' && wonTile && (
            <Text style={styles.wonText}>You won: {wonTile.label}!</Text>
          )}
          {/* Rewarded re-spin offer — only renders AFTER the natural
              celebration has landed (settled phase), only when the
              once-per-day throttle agrees, only when the ad cap allows.
              Per the dopamine-arc rule: NEVER show this before or
              during the natural reward animation. */}
          {spinPhase === 'settled' &&
            canClaimDailyWheelRespin() &&
            canShowRewarded() && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRespin}
              disabled={respinAdInFlight}
              style={styles.respinCta}
            >
              <Text style={styles.respinText}>
                {respinAdInFlight ? 'Loading ad…' : '🎁  Watch ad → Spin again'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Button
        title={
          spinPhase === 'spinning'
            ? 'Spinning…'
            : spinPhase === 'settled'
            ? 'Awesome!'
            : canClaim
            ? 'Spin & Claim!'
            : 'Come Back Tomorrow'
        }
        onPress={
          spinPhase === 'spinning'
            ? () => {}
            : spinPhase === 'settled'
            ? handleClose
            : canClaim
            ? handleClaim
            : onClose
        }
        variant={
          spinPhase === 'spinning'
            ? 'ghost'
            : canClaim || spinPhase === 'settled'
            ? 'primary'
            : 'ghost'
        }
        size="medium"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  dayCard: {
    width: 72,
    height: 80,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...SHADOWS.small,
  },
  dayCardClaimed: {
    backgroundColor: COLORS.gridEmpty,
    borderColor: COLORS.gridLine,
    opacity: 0.6,
  },
  dayCardCurrent: {
    borderColor: COLORS.accentGold,
    borderWidth: 2,
    backgroundColor: `${COLORS.accentGold}10`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  dayLabelClaimed: {
    color: COLORS.textMuted,
  },
  dayReward: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  dayRewardClaimed: {
    color: COLORS.textMuted,
  },
  dayBonus: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accent,
  },
  claimedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  wheelSection: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  wheelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  wheelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  wheelTile: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  wheelTileRare: {
    borderColor: COLORS.accentGold,
    borderWidth: 2,
    backgroundColor: `${COLORS.accentGold}15`,
  },
  wheelTileSpinning: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: `${COLORS.accent}20`,
    transform: [{ scale: 1.08 }],
  },
  wheelTileWinner: {
    borderColor: COLORS.accentGold,
    borderWidth: 3,
    backgroundColor: `${COLORS.accentGold}30`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    transform: [{ scale: 1.12 }],
  },
  wheelTileLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  wheelTileLabelRare: {
    color: COLORS.accentGold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  wonText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 0.5,
  },
  respinCta: {
    marginTop: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: `${COLORS.accent}50`,
    alignSelf: 'center',
  },
  respinText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
});
