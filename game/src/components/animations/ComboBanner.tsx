/**
 * Combo chain banner — animated reward for consecutive clears.
 *
 * Drives the single biggest source of "wickedly addictive" feel in
 * block-puzzle games per the Block Blast / Royal Match research wave:
 * constant verbal positive reinforcement that escalates with the chain.
 * "Nice!" → "Great!" → "Amazing!" → "FEVER!" → "UNSTOPPABLE!" is the
 * proven label ladder; the colors and multipliers come from the
 * already-shipped `ComboChain.ts` source of truth.
 *
 * Visual escalation:
 *   - chain 2-3: pill in matching color, brief burst
 *   - chain 4+: golden accent, stronger shockwave
 *   - chain 5+ (FEVER): full screen-level reaction — pulsing border,
 *     bigger scale punch, longer hold, extra ring
 *   - chain 6+ (UNSTOPPABLE): same but in red-orange, maximum impact
 *
 * Scaffolding for ComboChain.ts had been written for an earlier
 * iteration but was orphaned — never imported into the UI. This rewire
 * connects the data the game already calculates to a visual that does
 * justice to it.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, ANIM, RADII, SHADOWS } from '../../utils/constants';
import { getComboChainState } from '../../game/systems/ComboChain';

const { width: SCREEN_W } = Dimensions.get('window');

interface ComboBannerProps {
  combo: number;
  visible: boolean;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ combo, visible }) => {
  const translateX = useRef(new Animated.Value(-SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const shockwaveScale = useRef(new Animated.Value(0.5)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;
  const feverPulse = useRef(new Animated.Value(1)).current;

  const chainState = getComboChainState(combo);

  useEffect(() => {
    if (!visible || combo <= 1) return;

    translateX.setValue(-SCREEN_W);
    opacity.setValue(1);
    // FEVER+ punches harder on entrance — bigger initial scale = more
    // visual mass = the player's eye snaps to it. The "isFever" gate
    // means tier-5+ chains feel like a different kind of event, not
    // just bigger numbers.
    scale.setValue(chainState.isFever ? 0.4 : 0.6);
    shockwaveScale.setValue(0.5);
    shockwaveOpacity.setValue(chainState.isFever ? 0.8 : 0.6);
    feverPulse.setValue(1);

    // FEVER+ runs a continuous pulse loop for the full hold duration
    // so the banner literally vibrates with energy. We start it
    // unconditionally and let the cleanup stop it; cheaper than a
    // branched animation tree.
    const pulseLoop = chainState.isFever
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(feverPulse, {
              toValue: 1.08,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(feverPulse, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
        )
      : null;

    Animated.sequence([
      // Burst in
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: chainState.isFever ? 150 : 120,
          friction: chainState.isFever ? 6 : 7,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: chainState.isFever ? 1.2 : 1.1,
          tension: chainState.isFever ? 180 : 150,
          friction: 5,
          useNativeDriver: true,
        }),
        // Shockwave ring — bigger on FEVER+
        Animated.parallel([
          Animated.timing(shockwaveScale, {
            toValue: chainState.isFever ? 6 : 4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(shockwaveOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Settle
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      // Hold — FEVER holds longer so the player can read "FEVER!" and
      // feel the weight of it before it leaves
      Animated.delay(chainState.isFever ? ANIM.comboDuration + 350 : ANIM.comboDuration),
      // Zoom out and fade
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      pulseLoop?.stop();
    });

    pulseLoop?.start();

    return () => {
      pulseLoop?.stop();
    };
  }, [visible, combo, chainState.isFever]);

  if (!visible || combo <= 1 || !chainState.label) return null;

  const tierColor = chainState.color;
  // Compose the multiplier label as a short string so the player can
  // see "FEVER! x3.0" at a glance. Single-decimal so 1.5 / 2.0 / 2.5
  // are all consistent widths.
  const multiplierLabel = `x${chainState.multiplier.toFixed(1)}`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: `${tierColor}E0`,
          borderColor: `${tierColor}80`,
          transform: [{ translateX }, { scale: Animated.multiply(scale, feverPulse) }],
          opacity,
          // Re-apply shadow glow with the tier color so the banner's
          // halo always matches its label.
          shadowColor: tierColor,
          shadowOpacity: chainState.isFever ? 0.9 : 0.6,
          shadowRadius: chainState.isFever ? 24 : 16,
        },
      ]}
      pointerEvents="none"
    >
      {/* Shockwave ring behind */}
      <Animated.View
        style={[
          styles.shockwave,
          {
            transform: [{ scale: shockwaveScale }],
            opacity: shockwaveOpacity,
            borderColor: tierColor,
          },
        ]}
      />
      {/* Inner highlight */}
      <View style={styles.highlight} />
      {/* Accent bars use tier color for cohesion */}
      <View style={[styles.accentBar, styles.accentBarLeft, { backgroundColor: `${tierColor}90` }]} />
      <View style={[styles.accentBar, styles.accentBarRight, { backgroundColor: `${tierColor}90` }]} />
      <Text style={styles.comboLabel}>{chainState.label}</Text>
      <View style={styles.detailsRow}>
        <Text style={[styles.chainCount, { color: tierColor }]}>{combo}x</Text>
        <Text style={[styles.multiplier, { color: tierColor }]}>{multiplierLabel}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '24%',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: RADII.lg,
    borderWidth: 2,
    zIndex: 60,
    overflow: 'visible',
    ...SHADOWS.medium,
  },
  shockwave: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
  },
  accentBar: {
    position: 'absolute',
    top: '25%',
    width: 4,
    height: '50%',
    borderRadius: 2,
  },
  accentBarLeft: {
    left: 8,
  },
  accentBarRight: {
    right: 8,
  },
  comboLabel: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  chainCount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  multiplier: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
