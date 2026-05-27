/**
 * Lucky Spin wheel modal — one free spin per day.
 * Animated wheel with coin/gem/power-up prizes.
 * Uses Animated API rotation for Expo Go compatibility.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { Modal } from './common/Modal';
import { GameIcon } from './GameIcon';
import { usePlayerStore } from '../store/playerStore';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

/** Wheel segments with prizes */
const SEGMENTS = [
  { label: '25', type: 'coins' as const, amount: 25, color: COLORS.blocks[4] },
  { label: '1 Gem', type: 'gems' as const, amount: 1, color: COLORS.blocks[5] },
  { label: '50', type: 'coins' as const, amount: 50, color: COLORS.blocks[1] },
  { label: 'Bomb', type: 'powerup' as const, powerUp: 'bomb' as const, amount: 1, color: COLORS.blocks[0] },
  { label: '100', type: 'coins' as const, amount: 100, color: COLORS.blocks[3] },
  { label: '3 Gems', type: 'gems' as const, amount: 3, color: COLORS.blocks[2] },
  { label: '15', type: 'coins' as const, amount: 15, color: COLORS.blocks[6] },
  { label: 'Row Clear', type: 'powerup' as const, powerUp: 'rowClear' as const, amount: 1, color: COLORS.blocks[4] },
];

const SEGMENT_COUNT = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

interface LuckySpinModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LuckySpinModal: React.FC<LuckySpinModalProps> = ({ visible, onClose }) => {
  const { addCoins, addGems, addPowerUp, lastSpinDate, recordSpin } = usePlayerStore();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof SEGMENTS[number] | null>(null);
  const [claimed, setClaimed] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinCount = useRef(0);

  const today = new Date().toISOString().split('T')[0];
  const canSpin = lastSpinDate !== today;

  const handleSpin = useCallback(() => {
    if (spinning || !canSpin) return;

    setSpinning(true);
    setResult(null);
    setClaimed(false);

    // Pick random segment
    const targetIndex = Math.floor(Math.random() * SEGMENT_COUNT);
    const prize = SEGMENTS[targetIndex];

    // Spin 4-6 full rotations + land on target segment
    const extraRotations = 4 + Math.random() * 2;
    const targetAngle = extraRotations + (targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) / 360;

    spinCount.current += targetAngle;

    Animated.timing(spinAnim, {
      toValue: spinCount.current,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setResult(prize);

      // Award prize
      if (prize.type === 'coins') {
        addCoins(prize.amount, { boostable: true });
      } else if (prize.type === 'gems') {
        addGems(prize.amount);
      } else if (prize.type === 'powerup' && prize.powerUp) {
        addPowerUp(prize.powerUp, 1);
      }

      recordSpin();
      setClaimed(true);
    });
  }, [spinning, canSpin, spinAnim, addCoins, addGems, addPowerUp, recordSpin]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} onClose={onClose} dismissable={!spinning}>
      <View style={styles.header}>
        <GameIcon name="sparkle" size={28} color={COLORS.accentGold} />
        <Text style={styles.title}>Lucky Spin</Text>
        <Text style={styles.subtitle}>
          {canSpin && !claimed ? 'Spin for a free daily reward!' :
           claimed && result ? 'Congratulations!' :
           'Come back tomorrow!'}
        </Text>
      </View>

      {/* Wheel */}
      <View style={styles.wheelContainer}>
        {/* Pointer triangle at top */}
        <View style={styles.pointer}>
          <View style={styles.pointerTriangle} />
        </View>

        <Animated.View style={[styles.wheel, { transform: [{ rotate: rotation }] }]}>
          {SEGMENTS.map((seg, i) => {
            const angle = i * SEGMENT_ANGLE;
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -60 },
                    ],
                  },
                ]}
              >
                <View style={[styles.segmentInner, { backgroundColor: seg.color }]}>
                  <Text style={styles.segmentText}>{seg.label}</Text>
                </View>
              </View>
            );
          })}
          {/* Center circle */}
          <View style={styles.wheelCenter}>
            <GameIcon name="star" size={20} color={COLORS.accentGold} />
          </View>
        </Animated.View>
      </View>

      {/* Result display */}
      {result && claimed && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>You won:</Text>
          <Text style={styles.resultValue}>
            {result.type === 'coins' ? `${result.amount} Coins` :
             result.type === 'gems' ? `${result.amount} Gem${result.amount > 1 ? 's' : ''}` :
             result.label}
          </Text>
        </View>
      )}

      {/* Spin button */}
      {canSpin && !claimed ? (
        <Pressable
          onPress={handleSpin}
          disabled={spinning}
          style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
        >
          <Text style={styles.spinButtonText}>
            {spinning ? 'Spinning...' : 'SPIN!'}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>
            {claimed ? 'Collect & Close' : 'Close'}
          </Text>
        </Pressable>
      )}
    </Modal>
  );
};

const WHEEL_SIZE = 220;

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
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  wheelContainer: {
    width: WHEEL_SIZE + 20,
    height: WHEEL_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: SPACING.md,
  },
  pointer: {
    position: 'absolute',
    top: -2,
    zIndex: 10,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.accentGold,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    borderColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
  segment: {
    position: 'absolute',
    alignItems: 'center',
    width: 50,
    height: 60,
  },
  segmentInner: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wheelCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    borderWidth: 3,
    borderColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  resultCard: {
    backgroundColor: `${COLORS.accentGold}15`,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  resultValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 1,
  },
  spinButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: RADII.lg,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accentDark,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  closeButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: RADII.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
