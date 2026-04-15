/**
 * Hold Slot — lets players stash a piece for later.
 * Tap with a selected piece to move it into the slot.
 * Tap when no selection and slot is filled to retrieve it into the tray.
 * A small but powerful strategic tool for setting up combos.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Piece } from '../game/engine/Piece';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { COLORS, RADII } from '../utils/constants';

interface HoldSlotProps {
  heldPiece: Piece | null;
  canHold: boolean;
  canRetrieve: boolean;
  onPress: () => void;
}

const SLOT_SIZE = 56;

export const HoldSlot: React.FC<HoldSlotProps> = ({
  heldPiece,
  canHold,
  canRetrieve,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const disabled = !canHold && !canRetrieve;

  // Gentle pulse when an action is available
  useEffect(() => {
    if (disabled) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [disabled, pulseAnim]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>HOLD</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.slot,
            heldPiece && styles.slotFilled,
            disabled && styles.slotDisabled,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {heldPiece ? (
            <PieceRenderer piece={heldPiece} cellSize={10} gap={1} />
          ) : (
            <Text style={styles.placeholder}>+</Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  touchable: {
    borderRadius: RADII.md,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderStyle: 'solid',
    borderColor: COLORS.accent,
    backgroundColor: `${COLORS.accent}15`,
  },
  slotDisabled: {
    opacity: 0.4,
  },
  placeholder: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
});
