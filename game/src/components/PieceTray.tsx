/**
 * Displays the 3 available pieces for the player to select and place.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece } from '../game/engine/Piece';
import { COLORS } from '../utils/constants';

interface PieceTrayProps {
  pieces: (Piece | null)[];
  selectedIndex: number | null;
  onSelectPiece: (index: number) => void;
}

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  selectedIndex,
  onSelectPiece,
}) => {
  return (
    <View style={styles.container}>
      {pieces.map((piece, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.pieceSlot,
            selectedIndex === index && styles.selectedSlot,
            !piece && styles.emptySlot,
          ]}
          onPress={() => piece && onSelectPiece(index)}
          disabled={!piece}
          activeOpacity={0.7}
        >
          {piece ? (
            <PieceRenderer
              piece={piece}
              selected={selectedIndex === index}
              disabled={false}
            />
          ) : (
            <View style={styles.placedIndicator} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  pieceSlot: {
    minWidth: 80,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSlot: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}15`,
  },
  emptySlot: {
    opacity: 0.3,
  },
  placedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gridEmpty,
  },
});
