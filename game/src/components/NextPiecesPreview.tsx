/**
 * Shows a small preview of the next set of pieces that will arrive
 * after all current tray pieces are placed. Helps players plan ahead.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Piece } from '../game/engine/Piece';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { COLORS, RADII } from '../utils/constants';

interface NextPiecesPreviewProps {
  pieces: Piece[];
  visible: boolean;
}

export const NextPiecesPreview: React.FC<NextPiecesPreviewProps> = ({ pieces, visible }) => {
  if (!visible || pieces.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>NEXT</Text>
      <View style={styles.row}>
        {pieces.map((piece, i) => (
          <View key={i} style={styles.slot}>
            <PieceRenderer piece={piece} cellSize={7} gap={1} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  slot: {
    backgroundColor: `${COLORS.surface}80`,
    borderRadius: RADII.sm,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
    minHeight: 24,
  },
});
