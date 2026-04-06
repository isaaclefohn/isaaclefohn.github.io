/**
 * Core gameplay screen with juicy animations, board shake, and confetti.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useGameEngine } from '../hooks/useGameEngine';
import { useSound } from '../hooks/useSound';
import { usePlayerStore } from '../store/playerStore';
import { GameBoard } from '../components/GameBoard';
import { PieceTray, DragEvent } from '../components/PieceTray';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece, getPieceCells, getPieceSize } from '../game/engine/Piece';
import { canPlace } from '../game/engine/Board';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { PowerUpBar } from '../components/PowerUpBar';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { GameIcon } from '../components/GameIcon';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ScorePopup } from '../components/animations/ScorePopup';
import { ComboBanner } from '../components/animations/ComboBanner';
import { Confetti } from '../components/animations/Confetti';
import { PowerUpType } from '../game/powerups/PowerUpManager';
import { FloatingParticles } from '../components/animations/FloatingParticles';
import { ClearFlash } from '../components/animations/ClearFlash';
import { ScreenVignette } from '../components/animations/ScreenVignette';
import { CELL_SIZE, CELL_GAP, COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import { formatScore } from '../utils/formatters';
import { calculateCoinReward } from '../game/engine/Scoring';
import { canShowRewarded, onLevelCompleted, showRewardedAd, showInterstitialAd, AD_REWARDS } from '../services/ads';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

type GameScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
  route: RouteProp<RootStackParamList, 'Game'>;
};

const POWER_UP_LABELS: Record<PowerUpType, string> = {
  bomb: 'Bomb',
  rowClear: 'Row Clear',
  colorClear: 'Color Clear',
};

const POWER_UP_ICON_NAMES: Record<PowerUpType, 'bomb' | 'lightning' | 'palette'> = {
  bomb: 'bomb',
  rowClear: 'lightning',
  colorClear: 'palette',
};

export const GameScreen: React.FC<GameScreenProps> = ({ navigation, route }) => {
  const { level } = route.params;
  const {
    gameState,
    levelConfig,
    selectedPieceIndex,
    stars,
    loadLevel,
    selectPiece,
    placePiece,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
  } = useGameEngine();

  const { playSound } = useSound();
  const { powerUps, usePowerUp, coins, gems, addCoins } = usePlayerStore();

  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [showComboBanner, setShowComboBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastCombo, setLastCombo] = useState(0);
  const [ghostCells, setGhostCells] = useState<{ row: number; col: number; colorIndex: number }[]>([]);
  const [showClearFlash, setShowClearFlash] = useState(false);
  const [clearFlashColor, setClearFlashColor] = useState<string>(COLORS.accent);
  const [placedCells, setPlacedCells] = useState<{ row: number; col: number }[]>([]);
  const [clearedRows, setClearedRows] = useState<number[]>([]);
  const [clearedCols, setClearedCols] = useState<number[]>([]);

  // Drag-and-drop state
  const [draggedPieceIndex, setDraggedPieceIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const boardOriginRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // Board shake animation
  const boardShakeX = useRef(new Animated.Value(0)).current;
  const boardScale = useRef(new Animated.Value(1)).current;

  // Load level on mount
  useEffect(() => {
    loadLevel(level);
  }, [level, loadLevel]);

  // Board shake helper
  const shakeBoard = useCallback((intensity: number = 1) => {
    const magnitude = 4 * intensity;
    Animated.sequence([
      Animated.timing(boardShakeX, { toValue: magnitude, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: -magnitude, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: magnitude * 0.6, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: -magnitude * 0.6, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [boardShakeX]);

  // Board pulse on placement
  const pulseBoard = useCallback(() => {
    Animated.sequence([
      Animated.timing(boardScale, { toValue: 1.01, duration: 80, useNativeDriver: true }),
      Animated.spring(boardScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
    ]).start();
  }, [boardScale]);

  // Handle win/loss
  useEffect(() => {
    if (gameState?.status === 'won') {
      playSound('levelWin');
      setShowConfetti(true);
      setTimeout(() => setShowWinModal(true), 600);
      if (onLevelCompleted()) {
        showInterstitialAd();
      }
    } else if (gameState?.status === 'lost') {
      playSound('gameOver');
      shakeBoard(2);
      setTimeout(() => setShowLoseModal(true), 400);
    }
  }, [gameState?.status, playSound, shakeBoard]);

  // Handle score events
  useEffect(() => {
    if (gameState?.lastScoreEvent) {
      const event = gameState.lastScoreEvent;
      setLastPoints(event.points);
      setLastCombo(event.combo);
      setShowScorePopup(true);

      if (event.perfectClear) {
        playSound('combo');
        setShowComboBanner(true);
        setShowConfetti(true);
        setClearFlashColor(COLORS.accentGold);
        setShowClearFlash(true);
        shakeBoard(3);
        setTimeout(() => setShowConfetti(false), 2500);
        setTimeout(() => setShowClearFlash(false), 400);
      } else if (event.linesCleared >= 3) {
        playSound('combo');
        setShowComboBanner(true);
        setClearFlashColor(COLORS.accent);
        setShowClearFlash(true);
        shakeBoard(2);
        setTimeout(() => setShowClearFlash(false), 400);
      } else if (event.combo > 1) {
        playSound('combo');
        setShowComboBanner(true);
        setClearFlashColor(COLORS.accent);
        setShowClearFlash(true);
        shakeBoard(Math.min(event.combo * 0.5, 2.5));
        setTimeout(() => setShowClearFlash(false), 400);
      } else if (event.breakdown.clearBonus > 0) {
        playSound('clear');
        shakeBoard(0.5);
      }
    }
  }, [gameState?.lastScoreEvent, playSound, shakeBoard]);

  const handleSelectPiece = useCallback((index: number) => {
    setActivePowerUp(null);
    if (selectedPieceIndex === index) {
      selectPiece(null);
      setGhostCells([]);
    } else {
      selectPiece(index);
      setGhostCells([]);
    }
    playSound('select');
  }, [selectedPieceIndex, selectPiece, playSound]);

  const handleCellTap = useCallback((row: number, col: number) => {
    if (!gameState) return;

    if (activePowerUp) {
      const success = usePowerUp(activePowerUp);
      if (success) {
        const result = applyPowerUp(activePowerUp, row, col);
        if (result) {
          playSound('clear');
          shakeBoard(1);
          setActivePowerUp(null);
          return;
        }
      }
      setActivePowerUp(null);
      return;
    }

    if (selectedPieceIndex === null) return;
    const success = placePiece(selectedPieceIndex, row, col);
    if (success) {
      playSound('place');
      pulseBoard();
      setGhostCells([]);
    }
  }, [selectedPieceIndex, gameState, placePiece, activePowerUp, applyPowerUp, usePowerUp, playSound, shakeBoard, pulseBoard]);

  const handleBoardLayout = useCallback((x: number, y: number, width: number, height: number) => {
    boardOriginRef.current = { x, y, width, height };
  }, []);

  const screenToBoard = useCallback((screenX: number, screenY: number, piece: Piece) => {
    const { x: bx, y: by } = boardOriginRef.current;
    const cellTotal = CELL_SIZE + CELL_GAP;
    const cells = getPieceCells(piece);
    const midRow = cells.length > 0 ? cells[Math.floor(cells.length / 2)].row : 0;
    const midCol = cells.length > 0 ? cells[Math.floor(cells.length / 2)].col : 0;

    const localX = screenX - bx - CELL_GAP;
    const localY = screenY - by - CELL_GAP;
    const col = Math.floor(localX / cellTotal) - midCol;
    const row = Math.floor(localY / cellTotal) - midRow;
    return { row, col };
  }, []);

  const computeDragGhost = useCallback((pieceIndex: number, screenX: number, screenY: number) => {
    if (!gameState) return;
    const piece = gameState.availablePieces[pieceIndex];
    if (!piece) return;
    const { row, col } = screenToBoard(screenX, screenY, piece);
    if (canPlace(gameState.grid, piece, row, col)) {
      const cells = getPieceCells(piece);
      setGhostCells(cells.map(c => ({
        row: row + c.row,
        col: col + c.col,
        colorIndex: piece.colorIndex,
      })));
    } else {
      setGhostCells([]);
    }
  }, [gameState, screenToBoard]);

  const handleDragStart = useCallback((event: DragEvent) => {
    setActivePowerUp(null);
    selectPiece(null);
    setDraggedPieceIndex(event.pieceIndex);
    setDragPosition({ x: event.x, y: event.y });
    computeDragGhost(event.pieceIndex, event.x, event.y);
    playSound('select');
  }, [selectPiece, computeDragGhost, playSound]);

  const handleDragMove = useCallback((event: DragEvent) => {
    setDragPosition({ x: event.x, y: event.y });
    computeDragGhost(event.pieceIndex, event.x, event.y);
  }, [computeDragGhost]);

  const handleDragEnd = useCallback((event: DragEvent) => {
    if (!gameState) {
      setDraggedPieceIndex(null);
      setDragPosition(null);
      setGhostCells([]);
      return;
    }
    const piece = gameState.availablePieces[event.pieceIndex];
    if (piece) {
      const { row, col } = screenToBoard(event.x, event.y, piece);
      if (canPlace(gameState.grid, piece, row, col)) {
        const success = placePiece(event.pieceIndex, row, col);
        if (success) {
          playSound('place');
          pulseBoard();
        }
      }
    }
    setDraggedPieceIndex(null);
    setDragPosition(null);
    setGhostCells([]);
  }, [gameState, screenToBoard, placePiece, playSound, pulseBoard]);

  const handleActivatePowerUp = useCallback((type: PowerUpType) => {
    if (activePowerUp === type) {
      setActivePowerUp(null);
    } else {
      selectPiece(null);
      setGhostCells([]);
      setActivePowerUp(type);
      playSound('select');
    }
  }, [activePowerUp, selectPiece, playSound]);

  const handlePause = useCallback(() => { pauseGame(); setShowPauseMenu(true); }, [pauseGame]);
  const handleResume = useCallback(() => { setShowPauseMenu(false); resumeGame(); }, [resumeGame]);
  const handleNextLevel = useCallback(() => { setShowWinModal(false); setShowConfetti(false); navigation.replace('Game', { level: level + 1 }); }, [navigation, level]);
  const handleRetry = useCallback(() => { setShowLoseModal(false); setShowWinModal(false); setShowPauseMenu(false); setShowConfetti(false); setActivePowerUp(null); resetLevel(); }, [resetLevel]);
  const handleHome = useCallback(() => { navigation.navigate('Home'); }, [navigation]);

  const handleWatchAd = useCallback(async () => {
    if (!canShowRewarded()) return;
    const earned = await showRewardedAd();
    if (earned) {
      addCoins(AD_REWARDS.coins.amount);
      playSound('select');
    }
  }, [addCoins, playSound]);

  if (!gameState || !levelConfig) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const selectedPiece: Piece | null =
    selectedPieceIndex !== null ? (gameState.availablePieces[selectedPieceIndex] ?? null) : null;
  const isPowerUpMode = activePowerUp !== null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen vignette for depth */}
      <ScreenVignette />

      {/* Ambient particles */}
      <FloatingParticles count={8} />

      {/* Clear flash overlay */}
      <ClearFlash visible={showClearFlash} color={clearFlashColor} />

      {/* Confetti overlay */}
      <Confetti visible={showConfetti} />

      {/* Header */}
      <View style={styles.header}>
        <Button title={'\u2039'} onPress={handleHome} variant="ghost" size="small" />
        <CurrencyDisplay coins={coins} gems={gems} compact />
        <Button title={'\u23F8'} onPress={handlePause} variant="ghost" size="small" />
      </View>

      {/* Score display */}
      <ScoreDisplay
        score={gameState.score}
        combo={gameState.combo}
        objective={gameState.objective}
        level={gameState.level}
        stars={stars}
      />

      {/* Power-up targeting hint */}
      {isPowerUpMode && activePowerUp && (
        <View style={styles.powerUpHint}>
          <View style={styles.powerUpHintRow}>
            <GameIcon name={POWER_UP_ICON_NAMES[activePowerUp]} size={16} />
            <Text style={styles.powerUpHintText}>
              Tap the board to use {POWER_UP_LABELS[activePowerUp]}
            </Text>
          </View>
        </View>
      )}

      {/* Game board with shake animation */}
      <Animated.View
        style={[
          styles.boardContainer,
          {
            transform: [
              { translateX: boardShakeX },
              { scale: boardScale },
            ],
          },
        ]}
      >
        <GameBoard
          grid={gameState.grid}
          gridSize={gameState.gridSize}
          selectedPiece={isPowerUpMode ? null : selectedPiece}
          ghostCells={ghostCells}
          onCellTap={handleCellTap}
          onBoardLayout={handleBoardLayout}
          placedCells={gameState.lastPlacedCells}
          clearedRows={gameState.lastClearedRows}
          clearedCols={gameState.lastClearedCols}
          combo={gameState.combo}
        />

        <ScorePopup
          points={lastPoints}
          combo={lastCombo}
          visible={showScorePopup}
          onComplete={() => setShowScorePopup(false)}
        />
        <ComboBanner combo={lastCombo} visible={showComboBanner} />
      </Animated.View>

      {/* Power-up bar */}
      <PowerUpBar
        inventory={powerUps}
        activePowerUp={activePowerUp}
        onActivate={handleActivatePowerUp}
        disabled={gameState.status !== 'playing'}
      />

      {/* Piece tray */}
      <PieceTray
        pieces={gameState.availablePieces}
        selectedIndex={isPowerUpMode ? null : selectedPieceIndex}
        onSelectPiece={handleSelectPiece}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/* Pause Menu */}
      <Modal visible={showPauseMenu} onClose={handleResume} dismissable>
        <Text style={styles.modalTitle}>Paused</Text>
        <View style={styles.pauseStats}>
          <Text style={styles.pauseStatText}>Level {gameState.level}</Text>
          <Text style={styles.pauseStatText}>Score: {formatScore(gameState.score)}</Text>
        </View>
        <View style={styles.modalButtons}>
          <Button title="Resume" onPress={handleResume} variant="primary" size="medium" />
          <Button title="Restart" onPress={handleRetry} variant="secondary" size="medium" />
          <Button title="Quit" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>

      {/* Win Modal */}
      <Modal visible={showWinModal} onClose={() => {}} dismissable={false}>
        <View style={styles.modalIconWrap}>
          <GameIcon name="sparkle" size={48} color={COLORS.accentGold} />
        </View>
        <Text style={styles.modalTitle}>Level Complete!</Text>
        <View style={styles.modalStars}>
          {[1, 2, 3].map((s) => (
            <GameIcon key={s} name={s <= stars ? 'star' : 'star-outline'} size={40} />
          ))}
        </View>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardText}>+{calculateCoinReward(stars)}</Text>
          <GameIcon name="coin" size={18} />
        </View>
        <View style={styles.modalButtons}>
          <Button title="Next Level" onPress={handleNextLevel} variant="primary" size="medium" />
          <Button title="Retry" onPress={handleRetry} variant="secondary" size="small" />
          <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>

      {/* Lose Modal */}
      <Modal visible={showLoseModal} onClose={() => {}} dismissable={false}>
        <View style={styles.modalIconWrap}>
          <GameIcon name="target" size={48} color={COLORS.textMuted} />
        </View>
        <Text style={styles.modalTitle}>No More Moves</Text>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        <Text style={styles.modalTarget}>
          Target: {formatScore(levelConfig.objective.target)}
        </Text>
        <View style={styles.modalButtons}>
          <Button title="Try Again" onPress={handleRetry} variant="primary" size="medium" />
          {canShowRewarded() && (
            <Button
              title={`Watch Ad +${AD_REWARDS.coins.amount}`}
              onPress={handleWatchAd}
              variant="secondary"
              size="medium"
            />
          )}
          <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>
      {/* Drag overlay — floating piece following the finger */}
      {draggedPieceIndex !== null && dragPosition && gameState.availablePieces[draggedPieceIndex] && (() => {
        const dragPiece = gameState.availablePieces[draggedPieceIndex];
        const { width: pw, height: ph } = getPieceSize(dragPiece);
        const trayCellSize = 28;
        const trayGap = 3;
        const pieceW = pw * (trayCellSize + trayGap) + trayGap;
        const pieceH = ph * (trayCellSize + trayGap) + trayGap;
        return (
          <View style={styles.dragOverlay} pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                left: dragPosition.x - pieceW / 2,
                top: dragPosition.y - pieceH - 20,
              }}
            >
              <PieceRenderer
                piece={dragPiece}
                selected
                disabled={false}
              />
            </View>
          </View>
        );
      })()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  powerUpHint: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: `${COLORS.accentGold}15`,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
    marginHorizontal: SPACING.md,
    borderRadius: RADII.sm,
  },
  powerUpHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  powerUpHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  pauseStats: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  pauseStatText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalIconWrap: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalStars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalScore: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: 2,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  modalTarget: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  modalButtons: {
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
