/**
 * Inbox modal - lists player messages and lets them claim attached rewards.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getActiveMessages, getTimeAgo, InboxMessage } from '../game/systems/Inbox';
import { GameIcon } from './GameIcon';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface InboxModalProps {
  visible: boolean;
  onClose: () => void;
}

export const InboxModal: React.FC<InboxModalProps> = ({ visible, onClose }) => {
  const {
    inboxMessages,
    inboxClaimed,
    inboxDismissed,
    addCoins,
    addGems,
    addPowerUp,
    claimInboxReward,
    dismissInboxMessage,
  } = usePlayerStore();

  const state = {
    messages: inboxMessages,
    claimedIds: inboxClaimed,
    dismissedIds: inboxDismissed,
  };
  const activeMessages = getActiveMessages(state);

  const handleClaim = (msg: InboxMessage) => {
    if (!msg.reward) return;
    if (state.claimedIds.includes(msg.id)) return;

    if (msg.reward.coins) addCoins(msg.reward.coins, { boostable: true });
    if (msg.reward.gems) addGems(msg.reward.gems);
    if (msg.reward.bomb) addPowerUp('bomb', msg.reward.bomb);
    if (msg.reward.rowClear) addPowerUp('rowClear', msg.reward.rowClear);
    if (msg.reward.colorClear) addPowerUp('colorClear', msg.reward.colorClear);

    claimInboxReward(msg.id);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <GameIcon name="gift" size={22} color={COLORS.accent} />
        <Text style={styles.title}>Inbox</Text>
      </View>

      {activeMessages.length === 0 ? (
        <View style={styles.emptyBox}>
          <GameIcon name="check" size={24} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No new messages</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {activeMessages.map((msg) => {
            const claimed = state.claimedIds.includes(msg.id);
            return (
              <View
                key={msg.id}
                style={[styles.messageCard, { borderLeftColor: msg.color }]}
              >
                <View style={styles.messageHeader}>
                  <View style={[styles.msgIcon, { backgroundColor: `${msg.color}20` }]}>
                    <GameIcon name={msg.icon as any} size={16} color={msg.color} />
                  </View>
                  <View style={styles.messageHeaderText}>
                    <Text style={styles.messageTitle} numberOfLines={1}>
                      {msg.title}
                    </Text>
                    <Text style={styles.messageTime}>{getTimeAgo(msg.sentAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => dismissInboxMessage(msg.id)}
                  >
                    <Text style={styles.dismissText}>×</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.messageBody}>{msg.body}</Text>

                {msg.reward && (
                  <View style={styles.rewardBox}>
                    <View style={styles.rewardItems}>
                      {msg.reward.coins ? (
                        <View style={styles.rewardItem}>
                          <GameIcon name="coin" size={12} />
                          <Text style={styles.rewardText}>+{msg.reward.coins}</Text>
                        </View>
                      ) : null}
                      {msg.reward.gems ? (
                        <View style={styles.rewardItem}>
                          <GameIcon name="gem" size={12} />
                          <Text style={styles.rewardText}>+{msg.reward.gems}</Text>
                        </View>
                      ) : null}
                      {msg.reward.bomb ? (
                        <View style={styles.rewardItem}>
                          <GameIcon name="bomb" size={12} />
                          <Text style={styles.rewardText}>x{msg.reward.bomb}</Text>
                        </View>
                      ) : null}
                      {msg.reward.rowClear ? (
                        <View style={styles.rewardItem}>
                          <GameIcon name="lightning" size={12} />
                          <Text style={styles.rewardText}>x{msg.reward.rowClear}</Text>
                        </View>
                      ) : null}
                      {msg.reward.colorClear ? (
                        <View style={styles.rewardItem}>
                          <GameIcon name="palette" size={12} />
                          <Text style={styles.rewardText}>x{msg.reward.colorClear}</Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      disabled={claimed}
                      onPress={() => handleClaim(msg)}
                      style={[styles.claimButton, claimed && styles.claimButtonDone]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.claimButtonText,
                          claimed && styles.claimButtonTextDone,
                        ]}
                      >
                        {claimed ? 'Claimed' : 'Claim'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  scroll: {
    maxHeight: 420,
    width: '100%',
  },
  scrollContent: {
    gap: 10,
  },
  messageCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    borderLeftWidth: 4,
    padding: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  msgIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageHeaderText: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  messageTime: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textMuted,
    marginTop: -2,
  },
  messageBody: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 8,
    gap: 8,
  },
  rewardItems: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  claimButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.sm,
  },
  claimButtonDone: {
    backgroundColor: `${COLORS.success}20`,
  },
  claimButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  claimButtonTextDone: {
    color: COLORS.success,
  },
});
