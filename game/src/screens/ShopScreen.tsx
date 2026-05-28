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
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { Button } from '../components/common/Button';
import { PRODUCTS, getCoinProducts, getGemProducts, getBundleProducts, getPremiumProducts, restorePurchases, requestPurchase, Product } from '../services/purchases';
import { POWER_UP_CONFIGS, PowerUpType } from '../game/powerups/PowerUpManager';
import { canShowRewarded, showRewardedAd } from '../services/ads';
import { POWER_UP_UPGRADES, getUpgradeInfo, canAffordUpgrade } from '../game/powerups/PowerUpUpgrades';
import { THEMES, BLOCK_SKINS, GameTheme, BlockSkin } from '../game/rendering/ThemeManager';
import { GameIcon } from '../components/GameIcon';
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

const TAB_ICON_NAMES: Record<ShopTab, 'coin' | 'lightning' | 'palette'> = {
  currency: 'coin',
  powerups: 'lightning',
  cosmetics: 'palette',
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
        <GameIcon name={TAB_ICON_NAMES[tab]} size={14} />
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
          <GameIcon
            name={
              product.reward.type === 'coins' ? 'coin'
              : product.reward.type === 'gems' ? 'gem'
              : product.reward.type === 'bundle' ? 'gift'
              : product.reward.type === 'vip' ? 'crown'
              : 'sparkle'
            }
            size={26}
          />
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

  /**
   * Route through the purchases service so the credit happens in exactly
   * one place — either inside `purchaseUpdatedListener` after Apple
   * confirms the transaction (real iOS), or inside the DEV STUB short-
   * circuit (Expo Go / web preview). Previously the credit logic lived
   * here in the UI handler, which Apple Guideline 3.1.1 would reject
   * (digital goods must use IAP) and which also meant a reviewer or
   * beta tester tapping "Buy" would get currency without paying.
   *
   * Platform branch: React Native Web's `Alert.alert` is a documented
   * no-op (literally `static alert() {}` in react-native-web's source).
   * That means on the public portfolio demo at
   * `isaaclefohn.github.io/game/preview/`, the Alert never rendered and
   * the "Buy" onPress callback never fired — the demo shop has been
   * silently broken since it shipped. The web branch below skips the
   * Alert and calls requestPurchase directly so the demo UX actually
   * works. iOS keeps the soft confirmation step before Apple's StoreKit
   * sheet.
   */
  const handleBuyIAP = (product: Product) => {
    if (Platform.OS === 'web') {
      // Web demo path: no Alert (it's a no-op), credit immediately via
      // the purchases.web.ts stub. Errors fall back to console.warn
      // since user-facing Alert.alert is unavailable.
      requestPurchase(product.id).then((ok) => {
        if (!ok) {
          console.warn('[Shop] web demo purchase failed', product.id);
        }
      });
      return;
    }
    Alert.alert(
      'Purchase',
      `Buy ${product.title} for ${product.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            const ok = await requestPurchase(product.id);
            if (!ok) {
              Alert.alert(
                'Purchase Unavailable',
                'In-app purchases are not available right now. Please try again later.',
              );
            }
            // On success, crediting happens inside services/purchases.ts:
            //   - Real iOS: purchaseUpdatedListener → validateReceipt → creditFromProduct
            //   - Dev: requestPurchase short-circuit → creditFromProduct
            // Either way the player's balance updates via the store, and
            // the UI reflects it automatically via the Zustand subscription.
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

  /** Rewarded ad → one free random power-up. Per the 2026-06 monetization
   *  plan: doubles rewarded ad inventory in a player-positive way (the
   *  player ASKED for the ad, they get real value, the cap from `ads.ts`
   *  still applies so this isn't spammable). The PowerUpType picked
   *  rotates to avoid stockpiling one kind. */
  /** Apple-required restore path for non-consumable IAPs. Calls into
   *  the service-layer `restorePurchases`, which queries platform-
   *  level ownership; the existing purchaseUpdatedListener re-grants
   *  entitlements (ad-free, VIP, starter-pack contents) as Apple
   *  replays them. Web stub is a no-op. */
  const [restoreInFlight, setRestoreInFlight] = useState(false);
  const handleRestorePurchases = useCallback(async () => {
    if (restoreInFlight) return;
    setRestoreInFlight(true);
    try {
      const restored = await restorePurchases();
      if (restored.length > 0) {
        Alert.alert(
          'Purchases Restored',
          `Restored ${restored.length} purchase${restored.length === 1 ? '' : 's'}.`,
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We did not find any previous non-consumable purchases on this Apple ID.',
        );
      }
    } finally {
      setRestoreInFlight(false);
    }
  }, [restoreInFlight]);

  const [adPowerUpInFlight, setAdPowerUpInFlight] = useState(false);
  const handleAdPowerUp = useCallback(async () => {
    if (adPowerUpInFlight || !canShowRewarded()) return;
    setAdPowerUpInFlight(true);
    try {
      const earned = await showRewardedAd();
      if (earned) {
        // Pick the power-up the player owns the least of — gentle anti-
        // hoarding so the player builds a balanced toolkit. Ties favor
        // bomb (the most generally useful) so the choice is never
        // surprising.
        const types: PowerUpType[] = ['bomb', 'rowClear', 'colorClear'];
        const counts = types.map((t) => player.powerUps[t]);
        const minCount = Math.min(...counts);
        const pick = types[counts.indexOf(minCount)];
        player.addPowerUp(pick, 1);
      }
    } finally {
      setAdPowerUpInFlight(false);
    }
  }, [adPowerUpInFlight, player]);

  const handleBuyTheme = (theme: GameTheme) => {
    // Atomic purchase-and-equip. Free OR already-owned themes equip
    // without charge; un-owned paid themes deduct gems + record
    // ownership + equip in one store action. Returns false only when
    // the player can't afford an un-owned paid theme.
    const ok = player.purchaseAndEquipTheme(theme.id, theme.price);
    if (!ok) {
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
              {/* Restore Purchases — Apple Guideline 3.1.1 REQUIRES
                  this surface for non-consumable IAPs (Remove Ads,
                  Starter Pack, VIP Pass) or the app is rejected.
                  Even though the actual purchase wiring is a DEV STUB
                  until Apple Developer enrollment lands, the restore
                  affordance must exist so the eventual switchover is
                  a code change not an architecture change. */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRestorePurchases}
                disabled={restoreInFlight}
                style={styles.restoreButton}
              >
                <Text style={styles.restoreButtonText}>
                  {restoreInFlight ? 'Restoring…' : 'Restore Purchases'}
                </Text>
              </TouchableOpacity>
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
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Power-Ups</Text>
              <Text style={styles.sectionSubtitle}>Spend coins to stock up</Text>

              {/* Rewarded "free power-up" CTA — only when the ad cap
                  allows. Picks the power-up the player owns least of,
                  gentle anti-stockpiling without surprising them. */}
              {canShowRewarded() && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleAdPowerUp}
                  disabled={adPowerUpInFlight}
                  style={styles.freePowerUpCta}
                >
                  <GameIcon name="lightning" size={18} color={COLORS.accentGold} />
                  <Text style={styles.freePowerUpText}>
                    {adPowerUpInFlight ? 'Loading ad…' : 'Watch ad → Free Power-Up'}
                  </Text>
                </TouchableOpacity>
              )}
              {(Object.keys(POWER_UP_CONFIGS) as PowerUpType[]).map((type) => {
                const config = POWER_UP_CONFIGS[type];
                const canAfford = player.coins >= config.coinCost;
                return (
                  <View key={type} style={styles.shopItem}>
                    <View style={styles.itemInfo}>
                      <View style={styles.iconContainer}>
                        <GameIcon
                          name={type === 'bomb' ? 'bomb' : type === 'rowClear' ? 'lightning' : 'palette'}
                          size={26}
                        />
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
                      title={`${config.coinCost} coins`}
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

            <SectionDivider label="Permanent" />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upgrades</Text>
              <Text style={styles.sectionSubtitle}>Permanently enhance your power-ups</Text>
              {(Object.keys(POWER_UP_UPGRADES) as PowerUpType[]).map((type) => {
                const currentLevel = player.powerUpLevels[type];
                const { current, next, maxLevel } = getUpgradeInfo(type, currentLevel);
                const affordable = next ? canAffordUpgrade(type, currentLevel, player.coins, player.gems) : false;
                const isMaxed = currentLevel >= maxLevel;

                return (
                  <View key={`upgrade-${type}`} style={[styles.shopItem, isMaxed && styles.equippedItem]}>
                    <View style={styles.itemInfo}>
                      <View style={styles.iconContainer}>
                        <GameIcon
                          name={type === 'bomb' ? 'bomb' : type === 'rowClear' ? 'lightning' : 'palette'}
                          size={26}
                        />
                      </View>
                      <View style={styles.itemTextBlock}>
                        <Text style={styles.itemName}>{current.name}</Text>
                        <Text style={styles.itemDesc}>{current.description}</Text>
                        <View style={styles.upgradePips}>
                          {Array.from({ length: maxLevel }).map((_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.upgradePip,
                                i < currentLevel
                                  ? { backgroundColor: COLORS.accentGold }
                                  : { backgroundColor: COLORS.gridEmpty },
                              ]}
                            />
                          ))}
                        </View>
                        {next && (
                          <Text style={styles.upgradeNext}>
                            Next: {next.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isMaxed ? (
                      <Text style={styles.maxedLabel}>MAX</Text>
                    ) : next ? (
                      <Button
                        title={`${next.coinCost}c + ${next.gemCost}g`}
                        onPress={() => {
                          // Atomic purchase: the store action re-checks
                          // affordability against live state and deducts
                          // both currencies + applies the upgrade in one
                          // set(). The `affordable` flag here is just for
                          // the disabled styling; the real gate is inside
                          // purchasePowerUpUpgrade so a stale closure can't
                          // produce a partial spend.
                          const ok = player.purchasePowerUpUpgrade(type, next.coinCost, next.gemCost);
                          if (!ok) {
                            Alert.alert('Not enough resources', `You need ${next.coinCost} coins and ${next.gemCost} gems.`);
                          }
                        }}
                        variant="secondary"
                        size="small"
                        disabled={!affordable}
                        style={styles.priceButton}
                        textStyle={styles.priceButtonText}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Cosmetics Tab */}
        {activeTab === 'cosmetics' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Board Themes</Text>
              <Text style={styles.sectionSubtitle}>Personalize your board with gems</Text>
              {Object.values(THEMES).map((theme) => {
                const isEquipped = player.equippedTheme === theme.id;
                // A paid theme the player already bought re-equips for
                // free — show "Equip", not the gem price.
                const isOwned = theme.price === 0 || player.ownedThemes.includes(theme.id);
                return (
                  <View key={theme.id} style={[styles.shopItem, isEquipped && styles.equippedItem]}>
                    <View style={styles.itemInfo}>
                      <View style={styles.themePreview}>
                        {theme.blockColors.slice(0, 4).map((color, i) => (
                          <View key={i} style={[styles.colorDot, { backgroundColor: color }]} />
                        ))}
                      </View>
                      <View style={styles.itemTextBlock}>
                        <Text style={styles.itemName}>{theme.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {theme.price > 0 && <GameIcon name="gem" size={12} />}
                          <Text style={styles.itemDesc}>
                            {theme.price === 0 ? 'Free' : `${theme.price} gems`}
                          </Text>
                        </View>
                        {isEquipped && (
                          <Text style={styles.equippedLabel}>Currently equipped</Text>
                        )}
                      </View>
                    </View>
                    <Button
                      title={
                        isEquipped
                          ? '\u2714 Equipped'
                          : isOwned
                            ? 'Equip'
                            : `${theme.price} gems`
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
                const isOwned = skin.price === 0 || player.ownedBlockSkins.includes(skin.id);
                return (
                  <View key={skin.id} style={[styles.shopItem, isEquipped && styles.equippedItem]}>
                    <View style={styles.itemInfo}>
                      <View style={styles.iconContainer}>
                        <GameIcon name="sparkle" size={26} />
                      </View>
                      <View style={styles.itemTextBlock}>
                        <Text style={styles.itemName}>{skin.name}</Text>
                        <Text style={styles.itemDesc}>
                          {skin.style.charAt(0).toUpperCase() + skin.style.slice(1)} style
                          {skin.price === 0 ? ' \u2022 Free' : ` \u2022 ${skin.price} gems`}
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
                          : isOwned
                            ? 'Equip'
                            : `${skin.price} gems`
                      }
                      onPress={() => {
                        // Atomic purchase-and-equip; free / already-owned
                        // skins equip without charge, un-owned paid skins
                        // deduct + record ownership + equip in one action.
                        const ok = player.purchaseAndEquipBlockSkin(skin.id, skin.price);
                        if (!ok) {
                          Alert.alert('Not enough gems', `You need ${skin.price} gems.`);
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

  // -- Restore Purchases (Apple-required for non-consumable IAPs) --
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  restoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },

  // -- Rewarded "free power-up" CTA --
  freePowerUpCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: `${COLORS.accentGold}15`,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}50`,
  },
  freePowerUpText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 0.3,
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

  // -- Upgrade pips --
  upgradePips: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  upgradePip: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  upgradeNext: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  maxedLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: 1,
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
