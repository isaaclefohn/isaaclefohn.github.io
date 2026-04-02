/**
 * Shop screen with tabs for currency, power-ups, cosmetics, and ad-free purchase.
 * Premium visual styling with animated entrance, pill tabs, badges, and glow effects.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { Button } from '../components/common/Button';
import { PRODUCTS, getCoinProducts, getGemProducts, getBundleProducts, getPremiumProducts, Product } from '../services/purchases';
import { POWER_UP_CONFIGS, PowerUpType } from '../game/powerups/PowerUpManager';
import { THEMES, BLOCK_SKINS, GameTheme, BlockSkin } from '../game/rendering/ThemeManager';
import { COLORS, SHADOWS, SPACING, RADII } from '../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type ShopScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Shop'>;
};

type ShopTab = 'currency' | 'powerups' | 'cosmetics';

const TAB_LABELS: Record<ShopTab, string> = {
  currency: 'Currency',
  powerups: 'Power-Ups',
  cosmetics: 'Themes',
};

const TAB_ICONS: Record<ShopTab, string> = {
  currency: '\uD83E\uDE99',
  powerups: '\u26A1',
  cosmetics: '\uD83C\uDFA8',
};

// ---------------------------------------------------------------------------
// Animated tab button with spring scale (mirrors Button.tsx pattern)
// ---------------------------------------------------------------------------
const AnimatedTab: React.FC<{
  tab: ShopTab;
  active: boolean;
  onPress: () => void;
}> = ({ tab, active, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.tabWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={[styles.tab, active ? styles.activeTab : styles.inactiveTab]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={styles.tabIcon}>{TAB_ICONS[tab]}</Text>
        <Text style={[styles.tabText, active && styles.activeTabText]}>
          {TAB_LABELS[tab]}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------
const SectionDivider: React.FC<{ label?: string }> = ({ label }) => (
  <View style={styles.dividerRow}>
    <View style={styles.dividerLine} />
    {label && <Text style={styles.dividerLabel}>{label}</Text>}
    <View style={styles.dividerLine} />
  </View>
);

// ---------------------------------------------------------------------------
// Badge component
// ---------------------------------------------------------------------------
const Badge: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <View style={[styles.badge, { backgroundColor: color }]}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Product card (currency IAP items)
// ---------------------------------------------------------------------------
const BADGE_LABELS: Record<string, { text: string; color: string }> = {
  best_value: { text: 'BEST VALUE', color: COLORS.accentGold },
  popular: { text: 'POPULAR', color: COLORS.accent },
  limited: { text: 'LIMITED', color: '#C084FC' },
  starter: { text: 'STARTER', color: COLORS.success },
};

const ProductCard: React.FC<{
  product: Product;
  onBuy: (product: Product) => void;
}> = ({ product, onBuy }) => {
  const isPremium = product.reward.type === 'ad_free' || product.reward.type === 'vip';
  const isBundle = product.reward.type === 'bundle';
  const badgeInfo = product.badge ? BADGE_LABELS[product.badge] : null;

  return (
    <View
      style={[
        styles.shopItem,
        isPremium && styles.premiumItem,
        isBundle && styles.featuredItem,
        badgeInfo && styles.featuredItem,
      ]}
    >
      {badgeInfo && <Badge text={badgeInfo.text} color={badgeInfo.color} />}

      <View style={styles.itemInfo}>
        <View style={[styles.iconContainer, isPremium && styles.premiumIconContainer]}>
          <Text style={styles.itemIcon}>
            {product.reward.type === 'coins'
              ? '\uD83E\uDE99'
              : product.reward.type === 'gems'
                ? '\uD83D\uDC8E'
                : product.reward.type === 'bundle'
                  ? '\uD83C\uDF81'
                  : product.reward.type === 'vip'
                    ? '\uD83D\uDC51'
                    : '\u2728'}
          </Text>
        </View>
        <View style={styles.itemTextBlock}>
          <Text style={[styles.itemName, isPremium && styles.premiumItemName]}>
            {product.title}
          </Text>
          <Text style={styles.itemDesc}>{product.description}</Text>
        </View>
      </View>

      <Button
        title={product.price}
        onPress={() => onBuy(product)}
        variant={isPremium ? 'secondary' : 'primary'}
        size="small"
        style={isPremium ? styles.premiumButton : styles.priceButton}
        textStyle={styles.priceButtonText}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main ShopScreen
// ---------------------------------------------------------------------------
export const ShopScreen: React.FC<ShopScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('currency');
  const player = usePlayerStore();

  // --- Header entrance animation (fade + slide down) ---
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(headerTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
    ]).start();
  }, [headerOpacity, headerTranslateY]);

  const handleBuyIAP = (product: Product) => {
    Alert.alert(
      'Purchase',
      `Buy ${product.title} for ${product.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            if (product.reward.type === 'coins') {
              player.addCoins(product.reward.amount);
              if (product.reward.bonus?.gems) player.addGems(product.reward.bonus.gems);
            } else if (product.reward.type === 'gems') {
              player.addGems(product.reward.amount);
              if (product.reward.bonus?.coins) player.addCoins(product.reward.bonus.coins);
            } else if (product.reward.type === 'ad_free') {
              player.setAdFree(true);
            } else if (product.reward.type === 'vip') {
              player.setAdFree(true);
              if (product.reward.bonus?.coins) player.addCoins(product.reward.bonus.coins);
              if (product.reward.bonus?.gems) player.addGems(product.reward.bonus.gems);
            } else if (product.reward.type === 'bundle') {
              const b = product.reward.bonus;
              if (b) {
                if (b.coins) player.addCoins(b.coins);
                if (b.gems) player.addGems(b.gems);
                if (b.bomb) player.addPowerUp('bomb', b.bomb);
                if (b.rowClear) player.addPowerUp('rowClear', b.rowClear);
                if (b.colorClear) player.addPowerUp('colorClear', b.colorClear);
              }
            }
          },
        },
      ]
    );
  };

  const handleBuyPowerUp = (type: PowerUpType) => {
    const config = POWER_UP_CONFIGS[type];
    const success = player.spendCoins(config.coinCost);
    if (success) {
      player.addPowerUp(type, 1);
    } else {
      Alert.alert('Not enough coins', `You need ${config.coinCost} coins.`);
    }
  };

  const handleBuyTheme = (theme: GameTheme) => {
    if (theme.price === 0) {
      player.equipTheme(theme.id);
      return;
    }
    const success = player.spendGems(theme.price);
    if (success) {
      player.equipTheme(theme.id);
    } else {
      Alert.alert('Not enough gems', `You need ${theme.price} gems.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shop</Text>
          <Text style={styles.headerSubtitle}>Upgrades & Rewards</Text>
        </View>
        <CurrencyDisplay />
      </Animated.View>

      {/* Pill Tabs */}
      <View style={styles.tabBar}>
        {(['currency', 'powerups', 'cosmetics'] as ShopTab[]).map((tab) => (
          <AnimatedTab
            key={tab}
            tab={tab}
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Currency Tab */}
        {activeTab === 'currency' && (
          <>
            {/* Premium / VIP */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premium</Text>
              {getPremiumProducts().map((product) => (
                <ProductCard key={product.id} product={product} onBuy={handleBuyIAP} />
              ))}
            </View>

            <SectionDivider />

            {/* Bundles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bundles</Text>
              <Text style={styles.sectionSubtitle}>Best deals — save big!</Text>
              {getBundleProducts().map((product) => (
                <ProductCard key={product.id} product={product} onBuy={handleBuyIAP} />
              ))}
            </View>

            <SectionDivider />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coins</Text>
              {getCoinProducts().map((product) => (
                <ProductCard key={product.id} product={product} onBuy={handleBuyIAP} />
              ))}
            </View>

            <SectionDivider />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gems</Text>
              {getGemProducts().map((product) => (
                <ProductCard key={product.id} product={product} onBuy={handleBuyIAP} />
              ))}
            </View>
          </>
        )}

        {/* Power-ups Tab */}
        {activeTab === 'powerups' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Power-Ups</Text>
            <Text style={styles.sectionSubtitle}>Spend coins to stock up</Text>
            {(Object.keys(POWER_UP_CONFIGS) as PowerUpType[]).map((type) => {
              const config = POWER_UP_CONFIGS[type];
              const canAfford = player.coins >= config.coinCost;
              return (
                <View key={type} style={styles.shopItem}>
                  <View style={styles.itemInfo}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.itemIcon}>
                        {type === 'bomb'
                          ? '\uD83D\uDCA3'
                          : type === 'rowClear'
                            ? '\u2194\uFE0F'
                            : '\uD83C\uDFA8'}
                      </Text>
                    </View>
                    <View style={styles.itemTextBlock}>
                      <Text style={styles.itemName}>{config.name}</Text>
                      <Text style={styles.itemDesc}>{config.description}</Text>
                      <View style={styles.ownedRow}>
                        <Text style={styles.itemOwned}>
                          Owned: {player.powerUps[type]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Button
                    title={`\uD83E\uDE99 ${config.coinCost}`}
                    onPress={() => handleBuyPowerUp(type)}
                    variant="primary"
                    size="small"
                    disabled={!canAfford}
                    style={styles.priceButton}
                    textStyle={styles.priceButtonText}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Cosmetics Tab */}
        {activeTab === 'cosmetics' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Board Themes</Text>
              <Text style={styles.sectionSubtitle}>Personalize your board with gems</Text>
              {Object.values(THEMES).map((theme) => {
                const isEquipped = player.equippedTheme === theme.id;
                return (
                  <View key={theme.id} style={[styles.shopItem, isEquipped && styles.equippedItem]}>
                    <View style={styles.itemInfo}>
                      <View style={styles.themePreview}>
                        {theme.blockColors.slice(0, 4).map((color, i) => (
                          <View key={i} style={[styles.colorDot, { backgroundColor: color }]} />
                        ))}
                      </View>
                      <View style={styles.itemTextBlock}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>{theme.emoji}</Text>
                          <Text style={styles.itemName}>{theme.name}</Text>
                        </View>
                        <Text style={styles.itemDesc}>
                          {theme.price === 0 ? 'Free' : `\uD83D\uDC8E ${theme.price} gems`}
                        </Text>
                        {isEquipped && (
                          <Text style={styles.equippedLabel}>Currently equipped</Text>
                        )}
                      </View>
                    </View>
                    <Button
                      title={
                        isEquipped
                          ? '\u2714 Equipped'
                          : theme.price === 0
                            ? 'Equip'
                            : `\uD83D\uDC8E ${theme.price}`
                      }
                      onPress={() => handleBuyTheme(theme)}
                      variant={isEquipped ? 'ghost' : 'primary'}
                      size="small"
                      disabled={isEquipped}
                      style={!isEquipped ? styles.priceButton : undefined}
                      textStyle={!isEquipped ? styles.priceButtonText : undefined}
                    />
                  </View>
                );
              })}
            </View>

            <SectionDivider />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Block Skins</Text>
              <Text style={styles.sectionSubtitle}>Change how your blocks look</Text>
              {Object.values(BLOCK_SKINS).map((skin) => {
                const isEquipped = player.equippedBlockSkin === skin.id;
                return (
                  <View key={skin.id} style={[styles.shopItem, isEquipped && styles.equippedItem]}>
                    <View style={styles.itemInfo}>
                      <View style={styles.iconContainer}>
                        <Text style={styles.itemIcon}>{skin.emoji}</Text>
                      </View>
                      <View style={styles.itemTextBlock}>
                        <Text style={styles.itemName}>{skin.name}</Text>
                        <Text style={styles.itemDesc}>
                          {skin.style.charAt(0).toUpperCase() + skin.style.slice(1)} style
                          {skin.price === 0 ? ' \u2022 Free' : ` \u2022 \uD83D\uDC8E ${skin.price} gems`}
                        </Text>
                        {isEquipped && (
                          <Text style={styles.equippedLabel}>Currently equipped</Text>
                        )}
                      </View>
                    </View>
                    <Button
                      title={
                        isEquipped
                          ? '\u2714 Equipped'
                          : skin.price === 0
                            ? 'Equip'
                            : `\uD83D\uDC8E ${skin.price}`
                      }
                      onPress={() => {
                        if (skin.price === 0 || isEquipped) {
                          player.equipBlockSkin(skin.id);
                        } else {
                          const success = player.spendGems(skin.price);
                          if (success) {
                            player.equipBlockSkin(skin.id);
                          } else {
                            Alert.alert('Not enough gems', `You need ${skin.price} gems.`);
                          }
                        }
                      }}
                      variant={isEquipped ? 'ghost' : 'primary'}
                      size="small"
                      disabled={isEquipped}
                      style={!isEquipped ? styles.priceButton : undefined}
                      textStyle={!isEquipped ? styles.priceButtonText : undefined}
                    />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Bottom spacer */}
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // -- Header --
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // -- Tabs --
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADII.round,
    gap: SPACING.xs,
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  activeTab: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.small,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.textPrimary,
  },

  // -- Content --
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },

  // -- Sections --
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },

  // -- Section divider --
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // -- Shop items --
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  featuredItem: {
    borderColor: COLORS.accentGold,
    borderWidth: 1.5,
  },
  premiumItem: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
    backgroundColor: COLORS.surfaceLight,
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.25,
  },
  equippedItem: {
    borderColor: COLORS.success,
    borderWidth: 1.5,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumIconContainer: {
    backgroundColor: COLORS.accent + '20',
  },
  itemIcon: {
    fontSize: 26,
  },
  itemTextBlock: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  premiumItemName: {
    color: COLORS.accentLight,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ownedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  itemOwned: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  equippedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: 2,
  },

  // -- Price buttons --
  priceButton: {
    minWidth: 80,
    paddingHorizontal: SPACING.md,
  },
  premiumButton: {
    minWidth: 80,
    paddingHorizontal: SPACING.md,
    borderColor: COLORS.accent,
  },
  priceButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },

  // -- Badges --
  badge: {
    position: 'absolute',
    top: -SPACING.xs,
    right: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADII.round,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.background,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // -- Theme previews --
  themePreview: {
    flexDirection: 'row',
    gap: 3,
    width: 48,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: RADII.sm,
  },
});
