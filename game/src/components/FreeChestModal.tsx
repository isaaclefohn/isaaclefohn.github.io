/**
 * Free Chest claim modal.
 * Shows the chest reward roll and lets the player claim it, kicking off
 * the next 4-hour timer. Persistent drop-in reward that drives return visits.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  rollFreeChest,
  FreeChestReward,
  isFreeChestReady,
} from '../game/rewards/FreeChest';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface FreeChestModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FreeChestModal: React.FC<FreeChestModalProps> = ({ visible, onClose }) => {
  const {
    highestLevel,
    freeChestLastClaimedAt,
    addCoins,
    addGems,
    addPowerUp,
    claimFreeChest,
  } = usePlayerStore();

  const ready = isFreeChestReady(freeChestLastClaimedAt);
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState<FreeChestReward | null>(null);

  // Roll the reward the first time the modal opens while ready
  useMemo(() => {
    if (visible && ready && !claimed) {
      setReward(rollFreeChest(highestLevel));
    }
    if (!visible) {
      setClaimed(false);
      setReward(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClaim = () => {
    if (!ready || !reward) return;
    addCoins(reward.coins);
    if (reward.gems > 0) addGems(reward.gems);
    if (reward.powerUp) addPowerUp(reward.powerUp.type, reward.powerUp.count);
    claimFreeChest();
    setClaimed(true);
    setTimeout(onClose, 900);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <GameIcon name="gift" size={44} color={COLORS.accentGold} />
        </View>
        <Text style={styles.title}>Free Chest</Text>
        <Text style={styles.subtitle}>
          {ready ? 'Ready to open!' : 'Come back soon for the next one'}
        </Text>
      </View>

      {ready && reward && (
        <View style={styles.rewardBox}>
          <View style={styles.rewardRow}>
            <GameIcon name="coin" size={16} />
            <Text style={styles.rewardText}>+{reward.coins.toLocaleString()}</Text>
          </View>
          {reward.gems > 0 && (
            <View style={styles.rewardRow}>
              <GameIcon name="gem" size={16} />
              <Text style={styles.rewardText}>+{reward.gems}</Text>
            </View>
          )}
          {reward.powerUp && (
            <View style={styles.rewardRow}>
              <GameIcon
                name={
                  reward.powerUp.type === 'bomb'
                    ? 'bomb'
                    : reward.powerUp.type === 'rowClear'
                      ? 'lightning'
                      : 'palette'
                }
                size={16}
              />
              <Text style={styles.rewardText}>x{reward.powerUp.count}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title={claimed ? 'Claimed!' : ready ? 'Open Chest' : 'Not Ready'}
          onPress={handleClaim}
          variant={ready && !claimed ? 'primary' : 'ghost'}
          size="large"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${COLORS.accentGold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  rewardBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.accentGold,
  },
  actions: {
    alignItems: 'center',
  },
});
