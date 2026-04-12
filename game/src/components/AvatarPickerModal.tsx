/**
 * Avatar picker modal.
 * Displays all available avatar frames in a grid and lets players
 * select their equipped avatar. Locked avatars show their unlock condition.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { AVATAR_FRAMES, AvatarFrame, isAvatarUnlocked } from '../game/customization/Avatars';
import { GameIcon } from './GameIcon';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

const rarityGlow: Record<AvatarFrame['rarity'], string> = {
  common: 'transparent',
  rare: '#60A5FA',
  epic: '#C084FC',
  legendary: '#FACC15',
};

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ visible, onClose }) => {
  const {
    highestLevel,
    levelStars,
    longestStreak,
    gems,
    ownedAvatars,
    equippedAvatar,
    equipAvatar,
    purchaseAvatar,
    spendGems,
  } = usePlayerStore();

  const totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0);
  const playerState = {
    highestLevel,
    totalStars,
    longestStreak,
    ownedAvatars,
  };

  const handleSelect = (frame: AvatarFrame) => {
    if (!isAvatarUnlocked(frame, playerState)) {
      if (frame.unlockType === 'purchase' && frame.costGems) {
        if (gems >= frame.costGems && spendGems(frame.costGems)) {
          purchaseAvatar(frame.id);
          equipAvatar(frame.id);
        }
      }
      return;
    }
    equipAvatar(frame.id);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Choose Avatar</Text>
      <Text style={styles.subtitle}>Unlock frames by playing</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {AVATAR_FRAMES.map((frame) => {
          const unlocked = isAvatarUnlocked(frame, playerState);
          const equipped = equippedAvatar === frame.id;
          const canBuy = frame.unlockType === 'purchase' && frame.costGems && gems >= frame.costGems;

          return (
            <TouchableOpacity
              key={frame.id}
              style={[
                styles.cell,
                equipped && styles.cellEquipped,
                !unlocked && styles.cellLocked,
              ]}
              onPress={() => handleSelect(frame)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.frame,
                  {
                    borderColor: unlocked ? frame.color : COLORS.textMuted,
                    borderWidth: frame.borderWidth,
                    shadowColor: rarityGlow[frame.rarity],
                    shadowOpacity: frame.rarity === 'common' ? 0 : 0.6,
                    shadowRadius: 6,
                  },
                ]}
              >
                <GameIcon
                  name={frame.icon as any}
                  size={22}
                  color={unlocked ? frame.color : COLORS.textMuted}
                />
              </View>
              <Text style={[styles.name, !unlocked && styles.nameMuted]} numberOfLines={1}>
                {frame.name}
              </Text>

              {!unlocked && (
                <View style={styles.lockRow}>
                  <GameIcon name="lock" size={8} color={COLORS.textMuted} />
                  <Text style={styles.unlockText}>
                    {frame.unlockType === 'level' && `Lv ${frame.unlockValue}`}
                    {frame.unlockType === 'stars' && `${frame.unlockValue}★`}
                    {frame.unlockType === 'streak' && `${frame.unlockValue}d`}
                    {frame.unlockType === 'purchase' && `${frame.costGems} gems`}
                  </Text>
                </View>
              )}
              {unlocked && equipped && (
                <View style={styles.equippedBadge}>
                  <Text style={styles.equippedText}>EQUIPPED</Text>
                </View>
              )}
              {frame.unlockType === 'purchase' && !unlocked && canBuy && (
                <Text style={styles.buyHint}>Tap to buy</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 340,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cell: {
    width: 88,
    padding: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellEquipped: {
    borderColor: COLORS.accent,
    backgroundColor: `${COLORS.accent}12`,
  },
  cellLocked: {
    opacity: 0.55,
  },
  frame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 4,
  },
  name: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  nameMuted: {
    color: COLORS.textMuted,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  unlockText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  equippedBadge: {
    marginTop: 2,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.sm,
  },
  equippedText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buyHint: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accentGold,
    marginTop: 2,
  },
});
