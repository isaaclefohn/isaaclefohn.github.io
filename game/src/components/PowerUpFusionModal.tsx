/**
 * Power-Up Fusion modal.
 * Two tabs: Fuse (combine 3 of the same power-up into a mega variant) and
 * Trade (convert between power-up kinds at set exchange rates).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  FUSION_RECIPES,
  TRADE_RECIPES,
  canFuse,
  canTrade,
  PowerUpKind,
} from '../game/systems/PowerUpFusion';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface PowerUpFusionModalProps {
  visible: boolean;
  onClose: () => void;
}

const POWERUP_META: Record<PowerUpKind, { icon: string; name: string; color: string }> = {
  bomb: { icon: 'bomb', name: 'Bomb', color: '#F97316' },
  rowClear: { icon: 'lightning', name: 'Row Clear', color: '#3B82F6' },
  colorClear: { icon: 'palette', name: 'Color Clear', color: '#EC4899' },
};

export const PowerUpFusionModal: React.FC<PowerUpFusionModalProps> = ({
  visible,
  onClose,
}) => {
  const { powerUps, megaPowerUps, fusePowerUp, tradePowerUp } = usePlayerStore();
  const [tab, setTab] = useState<'fuse' | 'trade'>('fuse');

  const handleFuse = (sourceCost: number, source: PowerUpKind, result: 'megabomb' | 'megaRow' | 'megaColor') => {
    fusePowerUp(source, sourceCost, result);
  };

  const handleTrade = (from: PowerUpKind, fromCost: number, to: PowerUpKind, toAmount: number) => {
    tradePowerUp(from, fromCost, to, toAmount);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Power-Up Workshop</Text>
      <Text style={styles.subtitle}>Fuse or trade your power-ups</Text>

      {/* Current inventory */}
      <View style={styles.inventoryRow}>
        {(Object.keys(POWERUP_META) as PowerUpKind[]).map((kind) => {
          const meta = POWERUP_META[kind];
          return (
            <View key={kind} style={styles.invItem}>
              <GameIcon name={meta.icon as any} size={14} color={meta.color} />
              <Text style={styles.invText}>x{powerUps[kind]}</Text>
            </View>
          );
        })}
      </View>

      {/* Tab selector */}
      <View style={styles.tabs}>
        <Button
          title="Fuse"
          onPress={() => setTab('fuse')}
          variant={tab === 'fuse' ? 'primary' : 'ghost'}
          size="small"
          style={styles.tabBtn}
        />
        <Button
          title="Trade"
          onPress={() => setTab('trade')}
          variant={tab === 'trade' ? 'primary' : 'ghost'}
          size="small"
          style={styles.tabBtn}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'fuse' ? (
          <>
            {FUSION_RECIPES.map((recipe) => {
              const affordable = canFuse(recipe, powerUps);
              const sourceMeta = POWERUP_META[recipe.source];
              return (
                <View key={recipe.result} style={[styles.card, { borderColor: recipe.resultColor }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: `${recipe.resultColor}20` }]}>
                      <GameIcon name={recipe.resultIcon as any} size={18} color={recipe.resultColor} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={[styles.cardName, { color: recipe.resultColor }]}>
                        {recipe.resultName}
                      </Text>
                      <Text style={styles.cardDesc}>{recipe.resultDescription}</Text>
                    </View>
                  </View>

                  <View style={styles.recipeRow}>
                    <View style={styles.recipeSide}>
                      <View style={styles.recipeChip}>
                        <GameIcon name={sourceMeta.icon as any} size={12} color={sourceMeta.color} />
                        <Text style={styles.recipeText}>x{recipe.sourceCost}</Text>
                      </View>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                    <View style={styles.recipeSide}>
                      <View style={styles.recipeChip}>
                        <GameIcon name={recipe.resultIcon as any} size={12} color={recipe.resultColor} />
                        <Text style={styles.recipeText}>x1</Text>
                      </View>
                    </View>
                    <Button
                      title={affordable ? 'Fuse' : 'Need more'}
                      onPress={() => handleFuse(recipe.sourceCost, recipe.source, recipe.result)}
                      variant={affordable ? 'primary' : 'ghost'}
                      size="small"
                    />
                  </View>
                </View>
              );
            })}

            <View style={styles.ownedBox}>
              <Text style={styles.ownedTitle}>Mega Trophies</Text>
              <View style={styles.ownedRow}>
                <View style={styles.invItem}>
                  <GameIcon name="bomb" size={14} color="#F97316" />
                  <Text style={styles.invText}>x{megaPowerUps.megabomb}</Text>
                </View>
                <View style={styles.invItem}>
                  <GameIcon name="lightning" size={14} color="#3B82F6" />
                  <Text style={styles.invText}>x{megaPowerUps.megaRow}</Text>
                </View>
                <View style={styles.invItem}>
                  <GameIcon name="palette" size={14} color="#EC4899" />
                  <Text style={styles.invText}>x{megaPowerUps.megaColor}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          TRADE_RECIPES.map((recipe, i) => {
            const affordable = canTrade(recipe, powerUps);
            const fromMeta = POWERUP_META[recipe.from];
            const toMeta = POWERUP_META[recipe.to];
            return (
              <View key={i} style={[styles.card, styles.tradeCard]}>
                <View style={styles.recipeRow}>
                  <View style={styles.recipeSide}>
                    <View style={styles.recipeChip}>
                      <GameIcon name={fromMeta.icon as any} size={12} color={fromMeta.color} />
                      <Text style={styles.recipeText}>x{recipe.fromCost}</Text>
                    </View>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={styles.recipeSide}>
                    <View style={styles.recipeChip}>
                      <GameIcon name={toMeta.icon as any} size={12} color={toMeta.color} />
                      <Text style={styles.recipeText}>x{recipe.toAmount}</Text>
                    </View>
                  </View>
                  <Button
                    title={affordable ? 'Trade' : 'Need more'}
                    onPress={() => handleTrade(recipe.from, recipe.fromCost, recipe.to, recipe.toAmount)}
                    variant={affordable ? 'primary' : 'ghost'}
                    size="small"
                  />
                </View>
              </View>
            );
          })
        )}
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
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 8,
    marginBottom: 10,
  },
  invItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
  },
  scroll: {
    maxHeight: 380,
    width: '100%',
  },
  scrollContent: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    borderLeftWidth: 3,
    padding: 10,
    gap: 8,
  },
  tradeCard: {
    borderColor: COLORS.textMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 6,
  },
  recipeSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  recipeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  arrow: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  ownedBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 10,
    marginTop: 6,
  },
  ownedTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  ownedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
});
