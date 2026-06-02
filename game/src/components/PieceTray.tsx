/**
 * Premium piece tray with glow selection, idle shimmer, animated slots, and drag-to-place.
 * Pieces have a gentle breathing pulse when idle, and a shimmer sweep on selection.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  GestureResponderEvent,
  PanResponderGestureState,
  Easing,
} from 'react-native';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece } from '../game/engine/Piece';
import { GameIcon } from './GameIcon';
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
  /**
   * Index of the "golden" piece in this tray. The endless-mode
   * golden-piece feature randomly marks one piece each fresh tray
   * (~10% probability); when placed AND it creates a clear, that
   * turn's score is doubled. The visual ring tells the player
   * which placement to optimize before they commit.
   */
  goldenIndex?: number | null;
  onSelectPiece: (index: number) => void;
  onDragStart?: (event: DragEvent) => void;
  onDragMove?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}

const DRAG_THRESHOLD = 8;

const PieceSlot: React.FC<{
  piece: Piece | null;
  isSelected: boolean;
  isGolden: boolean;
  onPress: () => void;
  index: number;
  onDragStart?: (event: DragEvent) => void;
  onDragMove?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}> = ({ piece, isSelected, isGolden, onPress, index, onDragStart, onDragMove, onDragEnd }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const idlePulse = useRef(new Animated.Value(1)).current;
  const shimmerX = useRef(new Animated.Value(-1)).current;
  // Golden piece pulses independently of the idle pulse — a stronger,
  // faster oscillation that draws the eye to the high-value slot.
  const goldenPulse = useRef(new Animated.Value(1)).current;
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Entrance bounce with stagger
  useEffect(() => {
    scaleAnim.setValue(0.3);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 6,
      delay: index * 120,
    }).start();
  }, [piece]);

  // Idle breathing pulse for available pieces
  useEffect(() => {
    if (!piece) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1.03,
          duration: 1500 + index * 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 1,
          duration: 1500 + index * 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [piece, index]);

  // Selection glow and shimmer
  useEffect(() => {
    Animated.timing(glowOpacity, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (isSelected) {
      // Shimmer sweep across the piece
      shimmerX.setValue(-1);
      Animated.loop(
        Animated.timing(shimmerX, {
          toValue: 2,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isSelected, glowOpacity, shimmerX]);

  // Golden-piece breathing pulse. Faster and bigger than the regular
  // idle pulse so the eye locks onto the high-value slot. Runs only
  // when isGolden — stops on placement (piece becomes null) or when
  // a new tray resets the index away.
  useEffect(() => {
    if (!isGolden || !piece) {
      goldenPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(goldenPulse, {
          toValue: 1.10,
          duration: 480,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(goldenPulse, {
          toValue: 1,
          duration: 480,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isGolden, piece, goldenPulse]);

  // PanResponder can only be ALLOCATED once (RN won't pick up a new instance
  // mid-gesture without losing the active drag), so the callbacks below close
  // over whatever values existed on first render. That used to mean a stale
  // `piece`, stale `onDragStart/Move/End` handlers (GameScreen recreates them
  // whenever gameState changes), and stale `index`/`onPress` — drags after the
  // first turn ran against the FIRST turn's grid / handler closures, which
  // surfaced as inconsistent ghost previews and "the drag knows about a piece
  // I already placed" bugs. The canonical RN workaround: route all reads
  // through a latestRef updated on every render.
  const latestRef = useRef({ piece, onDragStart, onDragMove, onDragEnd, onPress, index });
  latestRef.current = { piece, onDragStart, onDragMove, onDragEnd, onPress, index };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!latestRef.current.piece,
      onMoveShouldSetPanResponder: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (!latestRef.current.piece) return false;
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
        const cur = latestRef.current;
        if (!cur.piece) return;
        const movedEnough =
          Math.abs(gestureState.dx) > DRAG_THRESHOLD ||
          Math.abs(gestureState.dy) > DRAG_THRESHOLD;

        if (!isDraggingRef.current && movedEnough) {
          isDraggingRef.current = true;
          cur.onDragStart?.({
            pieceIndex: cur.index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
        }

        if (isDraggingRef.current) {
          cur.onDragMove?.({
            pieceIndex: cur.index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const cur = latestRef.current;
        if (isDraggingRef.current) {
          cur.onDragEnd?.({
            pieceIndex: cur.index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
          isDraggingRef.current = false;
        } else {
          if (cur.piece) {
            cur.onPress();
          }
        }
      },
      onPanResponderTerminate: (evt: GestureResponderEvent) => {
        const cur = latestRef.current;
        if (isDraggingRef.current) {
          cur.onDragEnd?.({
            pieceIndex: cur.index,
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          });
          isDraggingRef.current = false;
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        // Compose all three scale axes: entrance bounce, idle breath,
        // and golden pulse (1.0 when not golden, oscillating 1.0↔1.10
        // when golden). Putting the multiply here means the gold pulse
        // visually amplifies through the piece, the ring, and shimmer
        // all at once — they all read as one breathing object.
        transform: [
          {
            scale: Animated.multiply(
              Animated.multiply(scaleAnim, idlePulse),
              goldenPulse,
            ),
          },
        ],
      }}
    >
      <View
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={piece ? `${isGolden ? 'Golden piece. ' : ''}Piece ${index + 1}${isSelected ? ', selected' : ''}. Tap to select, drag to place.` : `Piece ${index + 1}, already placed`}
        style={[
          styles.pieceSlot,
          isSelected && styles.selectedSlot,
          !piece && styles.emptySlot,
          isGolden && piece && styles.goldenSlot,
        ]}
      >
        {/* Golden ring — rendered behind the piece, in front of the
            slot background. Solid border + halo shadow so the gold
            reads even at small piece sizes. Combined with the
            goldenPulse breathing animation on the outer Animated.View,
            this is what makes the rare ~10% golden piece visually
            unmistakable in the tray. */}
        {isGolden && piece && (
          <View style={styles.goldenRing} pointerEvents="none" />
        )}
        {/* Selection glow border */}
        {isSelected && (
          <Animated.View
            style={[
              styles.selectionGlow,
              { opacity: glowOpacity },
            ]}
          />
        )}
        {/* Shimmer overlay when selected */}
        {isSelected && piece && (
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [
                  {
                    translateX: shimmerX.interpolate({
                      inputRange: [-1, 2],
                      outputRange: [-100, 100],
                    }),
                  },
                ],
              },
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
            <GameIcon name="check" size={16} color={COLORS.success} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  selectedIndex,
  goldenIndex = null,
  onSelectPiece,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.trayInner}>
        {pieces.map((piece, index) => (
          <PieceSlot
            key={index}
            piece={piece}
            isSelected={selectedIndex === index}
            isGolden={goldenIndex === index && piece !== null}
            onPress={() => onSelectPiece(index)}
            index={index}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  trayInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    backgroundColor: `${COLORS.surface}80`,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  selectedSlot: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}10`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  goldenSlot: {
    backgroundColor: `${COLORS.accentGold}18`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  goldenRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: RADII.md + 2,
    borderWidth: 3,
    borderColor: COLORS.accentGold,
  },
  selectionGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: RADII.md + 1,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-15deg' }],
    zIndex: 10,
  },
  emptySlot: {
    opacity: 0.35,
    backgroundColor: COLORS.gridEmpty,
  },
  placedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.success}15`,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
