/**
 * Premium piece tray with glow selection and animated slots.
 */

import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece } from '../game/engine/Piece';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';

interface PieceTrayProps {
  pieces: (Piece | null)[];
  selectedIndex: number | null;
  onSelectPiece: (index: number) => void;
}

const PieceSlot: React.FC<{
  piece: Piece | null;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}> = ({ piece, isSelected, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance bounce
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 7,
      delay: index * 80,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(glowOpacity, {
      toValue: isSelected ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isSelected, glowOpacity]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.pieceSlot,
          isSelected && styles.selectedSlot,
          !piece && styles.emptySlot,
        ]}
        onPress={piece ? onPress : undefined}
        disabled={!piece}
        activeOpacity={0.7}
      >
        {/* Selection glow */}
        {isSelected && (
          <Animated.View
            style={[
              styles.selectionGlow,
              { opacity: glowOpacity },
            ]}
          />
        )}
        {piece ? (
          <PieceRenderer
            piece={piece}
            selected={isSelected}
            disabled={false}
          />
        ) : (
          <View style={styles.placedIndicator}>
            <View style={styles.checkmark} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  selectedIndex,
  onSelectPiece,
}) => {
  return (
    <View style={styles.container}>
      {pieces.map((piece, index) => (
        <PieceSlot
          key={index}
          piece={piece}
          isSelected={selectedIndex === index}
          onPress={() => onSelectPiece(index)}
          index={index}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  pieceSlot: {
    minWidth: 84,
    minHeight: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: 10,
    ...SHADOWS.small,
  },
  selectedSlot: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}10`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  selectionGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: RADII.md,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
  },
  emptySlot: {
    opacity: 0.35,
  },
  placedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    opacity: 0.6,
  },
});
