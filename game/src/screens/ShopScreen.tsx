/**
 * Shop screen with tabs for currency, power-ups, cosmetics, and ad-free purchase.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { Button } from '../components/common/Button';
import { PRODUCTS, getCoinProducts, getGemProducts, Product } from '../services/purchases';
import { POWER_UP_CONFIGS, PowerUpType } from '../game/powerups/PowerUpManager';
import { THEMES, GameTheme } from '../game/rendering/ThemeManager';
import { COLORS } from '../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type ShopScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Shop'>;
};

type ShopTab = 'currency' | 'powerups' | 'cosmetics';

export const ShopScreen: React.FC<ShopScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('currency');
  const player = usePlayerStore();

  const handleBuyIAP = (product: Product) => {
    // TODO: Trigger actual Apple IAP flow
    Alert.alert(
      'Purchase',
      `Buy ${product.title} for ${product.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            // Simulate purchase for development
            if (product.reward.type === 'coins') {
              player.addCoins(product.reward.amount);
            } else if (product.reward.type === 'gems') {
              player.addGems(product.reward.amount);
            } else if (product.reward.type === 'ad_free') {
              player.setAdFree(true);
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
      {/* Header */}
      <View style={styles.header}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Shop</Text>
        <CurrencyDisplay />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['currency', 'powerups', 'cosmetics'] as ShopTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'currency' ? 'Currency' : tab === 'powerups' ? 'Power-Ups' : 'Themes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Currency Tab */}
        {activeTab === 'currency' && (
          <>
            {/* Ad-free purchase */}
            {!player.adFree && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Premium</Text>
                {PRODUCTS.filter((p) => p.reward.type === 'ad_free').map((product) => (
                  <ProductCard key={product.id} product={product} onBuy={handleBuyIAP} />
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coins</Text>
              {getCoinProducts().map((product) => (
                <ProductCard key={product.id} product={product} onBuy={handleBuyIAP} />
              ))}
            </View>

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
            <Text style={styles.sectionTitle}>Power-Ups (buy with coins)</Text>
            {(Object.keys(POWER_UP_CONFIGS) as PowerUpType[]).map((type) => {
              const config = POWER_UP_CONFIGS[type];
              return (
                <View key={type} style={styles.shopItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemIcon}>
                      {type === 'bomb' ? '\uD83D\uDCA3' : type === 'rowClear' ? '\u2194\uFE0F' : '\uD83C\uDFA8'}
                    </Text>
                    <View>
                      <Text style={styles.itemName}>{config.name}</Text>
                      <Text style={styles.itemDesc}>{config.description}</Text>
                      <Text style={styles.itemOwned}>
                        Owned: {player.powerUps[type]}
                      </Text>
                    </View>
                  </View>
                  <Button
                    title={`${config.coinCost}`}
                    onPress={() => handleBuyPowerUp(type)}
                    variant="primary"
                    size="small"
                    disabled={player.coins < config.coinCost}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Cosmetics Tab */}
        {activeTab === 'cosmetics' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Board Themes (buy with gems)</Text>
            {Object.values(THEMES).map((theme) => {
              const isEquipped = player.equippedTheme === theme.id;
              return (
                <View key={theme.id} style={styles.shopItem}>
                  <View style={styles.itemInfo}>
                    <View style={styles.themePreview}>
                      {theme.blockColors.slice(0, 4).map((color, i) => (
                        <View key={i} style={[styles.colorDot, { backgroundColor: color }]} />
                      ))}
                    </View>
                    <View>
                      <Text style={styles.itemName}>{theme.name}</Text>
                      <Text style={styles.itemDesc}>
                        {theme.price === 0 ? 'Free' : `${theme.price} gems`}
                      </Text>
                    </View>
                  </View>
                  <Button
                    title={isEquipped ? 'Equipped' : theme.price === 0 ? 'Equip' : `${theme.price}`}
                    onPress={() => handleBuyTheme(theme)}
                    variant={isEquipped ? 'ghost' : 'primary'}
                    size="small"
                    disabled={isEquipped}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const ProductCard: React.FC<{
  product: Product;
  onBuy: (product: Product) => void;
}> = ({ product, onBuy }) => (
  <View style={styles.shopItem}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemIcon}>
        {product.reward.type === 'coins' ? '\uD83E\uDE99' :
         product.reward.type === 'gems' ? '\uD83D\uDC8E' : '\u2728'}
      </Text>
      <View>
        <Text style={styles.itemName}>{product.title}</Text>
        <Text style={styles.itemDesc}>{product.description}</Text>
      </View>
    </View>
    <Button
      title={product.price}
      onPress={() => onBuy(product)}
      variant="primary"
      size="small"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  activeTab: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemIcon: {
    fontSize: 28,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  itemOwned: {
    fontSize: 11,
    color: COLORS.accentGold,
    marginTop: 2,
  },
  themePreview: {
    flexDirection: 'row',
    gap: 3,
    width: 40,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
});
