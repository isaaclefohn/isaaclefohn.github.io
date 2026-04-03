/**
 * Premium piece tray with glow selection, animated slots, and drag-to-place support.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece } from '../game/engine/Piece';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';

export interface DragEvent {
  pieceIndex: number;
  /** Absolute screen position */
  x: number;
  y: number;
}

interface PieceTrayProps {
  pieces: (Piece | null)[];
  selectedIndex: number | null;
  onSelectPiece: (index: number) => void;
  onDragStart?: (event: DragEvent) => void;
  onDragMove?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}

const DRAG_THRESHOLD = 8; // px before we consider it a drag vs tap

const PieceSlot: React.FC<{
  piece: Piece | null;
  isSelected: boolean;
  onPress: () => void;
  index: number;
  onDragStart?: (event: DragEvent) => void;
  onDragMove?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}> = ({ piece, isSelected, onPress, index, onDragStart, onDragMove, onDragEnd }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!piece,
      onMoveShouldSetPanResponder: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (!piece) return false;
        // Only capture the move if the finger has moved beyond threshold
        return (
          Math.abs(gestureState.dx) > DRAG_THRESHOLD ||
          Math.abs(gestureState.dy) > DRAG_THRESHOLD
        );
      },
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isDraggingRef.current = false;
        startPosRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (!piece) return;
        const movedEnough =
          Math.abs(gestureState.dx) > DRAG_THRESHOLD ||
          Math.abs(gestureState.dy) > DRAG_THRESHOLD;

        if (!isDraggingRef.current && movedEnough) {
          isDraggingRef.current = true;
          onDragStart?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
        }

        if (isDraggingRef.current) {
          onDragMove?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        if (isDraggingRef.current) {
          onDragEnd?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
          isDraggingRef.current = false;
        } else {
          // It was a tap, not a drag
          if (piece) {
            onPress();
          }
        }
      },
      onPanResponderTerminate: (evt: GestureResponderEvent) => {
        if (isDraggingRef.current) {
          onDragEnd?.({
            pieceIndex: index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
          isDraggingRef.current = false;
        }
      },
    })
  ).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View
        {...panResponder.panHandlers}
        style={[
          styles.pieceSlot,
          isSelected && styles.selectedSlot,
          !piece && styles.emptySlot,
        ]}
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
      </View>
    </Animated.View>
  );
};

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  selectedIndex,
  onSelectPiece,
  onDragStart,
  onDragMove,
  onDragEnd,
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
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
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
