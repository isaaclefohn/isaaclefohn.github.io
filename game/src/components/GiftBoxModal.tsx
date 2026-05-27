/**
 * Gift box opening modal with reveal animation.
 * Shows a pulsing gift box that opens to reveal rewards.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { GiftBox, GIFT_RARITIES, formatGiftReward } from '../game/rewards/GiftBox';
import { usePlayerStore } from '../store/playerStore';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface GiftBoxModalProps {
  visible: boolean;
  gift: GiftBox | null;
  onClose: () => void;
}

export const GiftBoxModal: React.FC<GiftBoxModalProps> = ({ visible, gift, onClose }) => {
  const [opened, setOpened] = useState(false);
  const { addCoins, addGems, addPowerUp } = usePlayerStore();

  const boxScale = useRef(new Animated.Value(0.5)).current;
  const boxBounce = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const revealScale = useRef(new Animated.Value(0.3)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && gift) {
      setOpened(false);
      boxScale.setValue(0.5);
      boxBounce.setValue(0);
      revealOpacity.setValue(0);
      revealScale.setValue(0.3);

      // Box entrance
      Animated.spring(boxScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // Gentle bounce loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(boxBounce, { toValue: -8, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(boxBounce, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      // Shimmer effect
      Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [visible, gift]);

  const handleOpen = () => {
    if (!gift || opened) return;

    // Apply rewards
    for (const reward of gift.rewards) {
      switch (reward.type) {
        case 'coins':
          addCoins(reward.amount, { boostable: true });
          break;
        case 'gems':
          addGems(reward.amount);
          break;
        case 'powerup':
          if (reward.itemId) {
            addPowerUp(reward.itemId as 'bomb' | 'rowClear' | 'colorClear', reward.amount);
          }
          break;
      }
    }

    setOpened(true);

    // Animate box away and reveal rewards
    Animated.parallel([
      Animated.timing(boxScale, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(boxScale, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(revealOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(revealScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  };

  if (!gift) return null;

  const rarityInfo = GIFT_RARITIES[gift.rarity];

  return (
    <Modal visible={visible} onClose={onClose} dismissable={opened}>
      <Text style={styles.title}>{gift.label}</Text>

      {/* Gift box */}
      <Animated.View
        style={[
          styles.giftBox,
          {
            borderColor: rarityInfo.color,
            transform: [{ scale: boxScale }, { translateY: boxBounce }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.giftShimmer,
            {
              backgroundColor: `${rarityInfo.color}15`,
              opacity: shimmer.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.8, 0.3],
              }),
            },
          ]}
        />
        <View style={[styles.giftRibbon, { backgroundColor: rarityInfo.color }]} />
        <View style={[styles.giftRibbonV, { backgroundColor: rarityInfo.color }]} />
        <GameIcon name="gift" size={40} color={rarityInfo.color} />
      </Animated.View>

      {/* Reward reveal */}
      {opened && (
        <Animated.View style={[styles.rewardContainer, { opacity: revealOpacity, transform: [{ scale: revealScale }] }]}>
          {gift.rewards.map((reward, i) => (
            <View key={i} style={styles.rewardRow}>
              <GameIcon
                name={reward.type === 'coins' ? 'coin' : reward.type === 'gems' ? 'gem' : 'bomb'}
                size={20}
                color={rarityInfo.color}
              />
              <Text style={[styles.rewardText, { color: rarityInfo.color }]}>
                {formatGiftReward(reward)}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!opened ? (
          <Button title="Open!" onPress={handleOpen} variant="primary" size="large" />
        ) : (
          <Button title="Awesome!" onPress={onClose} variant="primary" size="large" />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  giftBox: {
    width: 100,
    height: 100,
    borderRadius: RADII.lg,
    borderWidth: 3,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  giftShimmer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADII.lg,
  },
  giftRibbon: {
    position: 'absolute',
    top: 0,
    left: '45%',
    width: '10%',
    height: '100%',
    opacity: 0.3,
  },
  giftRibbonV: {
    position: 'absolute',
    top: '45%',
    left: 0,
    width: '100%',
    height: '10%',
    opacity: 0.3,
  },
  rewardContainer: {
    gap: 10,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADII.md,
    minWidth: 180,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
});
