/**
 * Treasure Hunt modal.
 * Shows map pieces collected and lets the player open a chest
 * once they have enough pieces, revealing a randomized reward.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  PIECES_REQUIRED,
  rollTreasure,
  getTreasureTierColor,
  TreasureReward,
} from '../game/rewards/TreasureHunt';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface TreasureHuntModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TreasureHuntModal: React.FC<TreasureHuntModalProps> = ({ visible, onClose }) => {
  const {
    treasureMapPieces,
    openTreasureChestAtomic,
  } = usePlayerStore();

  const [revealed, setRevealed] = useState<TreasureReward | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const canOpen = treasureMapPieces >= PIECES_REQUIRED;

  useEffect(() => {
    if (!visible) {
      setRevealed(null);
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const handleOpen = () => {
    if (!canOpen) return;
    const reward = rollTreasure(Date.now());
    setRevealed(reward);

    // Atomic: deduct the 5 map pieces AND credit the reward in one
    // set(). Previously the credits ran BEFORE openTreasureChest()
    // deducted the pieces, so a crash mid-claim left the pieces at
    // threshold and the chest re-openable for a free re-grant.
    openTreasureChestAtomic({
      coins: reward.coins > 0 ? reward.coins : undefined,
      gems: reward.gems > 0 ? reward.gems : undefined,
      bomb: reward.powerUps.bomb > 0 ? reward.powerUps.bomb : undefined,
      rowClear: reward.powerUps.rowClear > 0 ? reward.powerUps.rowClear : undefined,
      colorClear: reward.powerUps.colorClear > 0 ? reward.powerUps.colorClear : undefined,
    });

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.iconCircle}>
        <GameIcon name="gift" size={32} color={COLORS.accentGold} />
      </View>
      <Text style={styles.title}>Treasure Hunt</Text>
      <Text style={styles.subtitle}>
        Collect map pieces from levels to open a chest
      </Text>

      {/* Map pieces */}
      <View style={styles.piecesRow}>
        {Array.from({ length: PIECES_REQUIRED }).map((_, i) => {
          const filled = i < Math.min(treasureMapPieces, PIECES_REQUIRED);
          return (
            <View
              key={i}
              style={[
                styles.piece,
                filled ? styles.pieceFilled : styles.pieceEmpty,
              ]}
            >
              {filled && <GameIcon name="map" size={14} color={COLORS.accentGold} />}
            </View>
          );
        })}
      </View>
      <Text style={styles.piecesCount}>
        {Math.min(treasureMapPieces, PIECES_REQUIRED)} / {PIECES_REQUIRED} pieces
      </Text>

      {revealed ? (
        <Animated.View
          style={[
            styles.rewardBox,
            {
              borderColor: getTreasureTierColor(revealed.tier),
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.tierLabel, { color: getTreasureTierColor(revealed.tier) }]}>
            {revealed.tier.toUpperCase()}
          </Text>
          <View style={styles.rewardGrid}>
            {revealed.coins > 0 && (
              <View style={styles.rewardItem}>
                <GameIcon name="coin" size={18} />
                <Text style={styles.rewardText}>+{revealed.coins}</Text>
              </View>
            )}
            {revealed.gems > 0 && (
              <View style={styles.rewardItem}>
                <GameIcon name="gem" size={18} />
                <Text style={styles.rewardText}>+{revealed.gems}</Text>
              </View>
            )}
            {revealed.powerUps.bomb > 0 && (
              <View style={styles.rewardItem}>
                <GameIcon name="bomb" size={18} />
                <Text style={styles.rewardText}>x{revealed.powerUps.bomb}</Text>
              </View>
            )}
            {revealed.powerUps.rowClear > 0 && (
              <View style={styles.rewardItem}>
                <GameIcon name="lightning" size={18} />
                <Text style={styles.rewardText}>x{revealed.powerUps.rowClear}</Text>
              </View>
            )}
            {revealed.powerUps.colorClear > 0 && (
              <View style={styles.rewardItem}>
                <GameIcon name="palette" size={18} />
                <Text style={styles.rewardText}>x{revealed.powerUps.colorClear}</Text>
              </View>
            )}
          </View>
          <Button title="Nice!" onPress={onClose} variant="primary" size="medium" />
        </Animated.View>
      ) : (
        <Button
          title={canOpen ? 'Open Chest' : `Need ${PIECES_REQUIRED - treasureMapPieces} more`}
          onPress={handleOpen}
          variant={canOpen ? 'primary' : 'secondary'}
          size="large"
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.accentGold}20`,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    marginHorizontal: 8,
  },
  piecesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  piece: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  pieceFilled: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}20`,
  },
  pieceEmpty: {
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surfaceLight,
    borderStyle: 'dashed',
  },
  piecesCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  rewardBox: {
    width: '100%',
    padding: 14,
    borderRadius: RADII.md,
    borderWidth: 2,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    gap: 10,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
});
