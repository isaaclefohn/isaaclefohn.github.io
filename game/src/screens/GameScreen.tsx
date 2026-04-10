/**
 * Core gameplay screen with juicy animations, board shake, and confetti.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Share } from 'react-native';
import { useGameEngine } from '../hooks/useGameEngine';
import { useBoardTension } from '../hooks/useBoardTension';
import { useSound } from '../hooks/useSound';
import { usePlayerStore } from '../store/playerStore';
import { GameBoard } from '../components/GameBoard';
import { PieceTray, DragEvent } from '../components/PieceTray';
import { PieceRenderer } from '../game/rendering/PieceRenderer';
import { Piece, getPieceCells, getPieceSize } from '../game/engine/Piece';
import { canPlace, findBestPlacement } from '../game/engine/Board';
import { getWorldForLevel } from '../game/levels/Worlds';
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
import { MilestoneBanner } from '../components/animations/MilestoneBanner';
import { FloatingParticles } from '../components/animations/FloatingParticles';
import { ClearFlash } from '../components/animations/ClearFlash';
import { ScreenVignette } from '../components/animations/ScreenVignette';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { ComboDisplay } from '../components/ComboDisplay';
import { ScoreOdometer } from '../components/ScoreOdometer';
import { Leaderboard } from '../components/Leaderboard';
import { FeatureUnlockBanner } from '../components/FeatureUnlockBanner';
import { getActiveEvents } from '../game/events/LiveEvents';
import { getNewlyUnlockedFeatures, FeatureGate } from '../game/progression/FeatureGating';
import { useSettingsStore } from '../store/settingsStore';
import { CELL_SIZE, CELL_GAP, COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import { formatScore } from '../utils/formatters';
import { calculateCoinReward } from '../game/engine/Scoring';
import { canShowRewarded, onLevelCompleted, showRewardedAd, showInterstitialAd, AD_REWARDS } from '../services/ads';
import { createChallenge, shareChallenge } from '../services/challenges';
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
  const { level, endless } = route.params;
  const isEndless = endless === true;
  const {
    gameState,
    levelConfig,
    selectedPieceIndex,
    stars,
    loadLevel,
    loadEndless,
    selectPiece,
    placePiece,
    rotatePiece,
    swapPieces,
    applyPowerUp,
    pauseGame,
    resumeGame,
    resetLevel,
    undoLastMove,
    canUndo,
    continueGame,
  } = useGameEngine();

  const { playSound, playPlacement } = useSound();
  const { powerUps, usePowerUp, coins, gems, addCoins, addPowerUp, spendGems, levelHighScores, zenHighScore, consecutiveFailures, lastFailedLevel, displayName, highestLevel } = usePlayerStore();
  const { tutorialCompleted, completeTutorial } = useSettingsStore();

  const showTutorial = !isEndless && level === 1 && !tutorialCompleted;

  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [showComboBanner, setShowComboBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [doubleCoinsUsed, setDoubleCoinsUsed] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastCombo, setLastCombo] = useState(0);
  const [ghostCells, setGhostCells] = useState<{ row: number; col: number; colorIndex: number }[]>([]);
  const [showClearFlash, setShowClearFlash] = useState(false);
  const [clearFlashColor, setClearFlashColor] = useState<string>(COLORS.accent);
  const [placedCells, setPlacedCells] = useState<{ row: number; col: number }[]>([]);
  const [milestoneMsg, setMilestoneMsg] = useState('');
  const [showMilestone, setShowMilestone] = useState(false);
  const milestoneShownRef = useRef(false);
  const [hintCells, setHintCells] = useState<{ row: number; col: number; colorIndex: number }[]>([]);
  const [rescueClaimed, setRescueClaimed] = useState(false);
  const [continueUsed, setContinueUsed] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActionRef = useRef(Date.now());
  const [clearedRows, setClearedRows] = useState<number[]>([]);
  const [clearedCols, setClearedCols] = useState<number[]>([]);
  const [unlockedFeature, setUnlockedFeature] = useState<FeatureGate | null>(null);
  const [showFeatureUnlock, setShowFeatureUnlock] = useState(false);

  // Drag-and-drop state
  const [draggedPieceIndex, setDraggedPieceIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const boardOriginRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // World theme for ambient visuals
  const currentWorld = isEndless ? null : getWorldForLevel(level);
  const worldParticleColors = currentWorld ? [
    `${currentWorld.color}18`,
    `${currentWorld.color}12`,
    `${COLORS.accentGold}10`,
    `${COLORS.accent}08`,
  ] : undefined;

  // Board tension — intensifies visuals as board fills
  const { tension, level: tensionLevel } = useBoardTension(gameState?.grid);

  // Board shake animation
  const boardShakeX = useRef(new Animated.Value(0)).current;
  const boardScale = useRef(new Animated.Value(1)).current;

  // Load level on mount
  useEffect(() => {
    if (isEndless) {
      loadEndless();
    } else {
      loadLevel(level);
    }
  }, [level, isEndless, loadLevel, loadEndless]);

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
      // Check for feature unlocks (previous highest was level-1 since we just completed `level`)
      if (!isEndless) {
        const newFeatures = getNewlyUnlockedFeatures(level - 1, level);
        if (newFeatures.length > 0) {
          setTimeout(() => {
            setUnlockedFeature(newFeatures[0]);
            setShowFeatureUnlock(true);
          }, 1200);
        }
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

  // Idle hint system — show best placement after 8s of inactivity
  const resetIdleTimer = useCallback(() => {
    lastActionRef.current = Date.now();
    setHintCells([]);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!gameState || gameState.status !== 'playing') return;

    idleTimerRef.current = setTimeout(() => {
      const state = gameState;
      if (!state || state.status !== 'playing') return;

      // Find the first available piece and its best placement
      for (let i = 0; i < state.availablePieces.length; i++) {
        const piece = state.availablePieces[i];
        if (!piece) continue;
        const best = findBestPlacement(state.grid, piece);
        if (best) {
          const cells = getPieceCells(piece);
          setHintCells(
            cells.map(c => ({
              row: best.row + c.row,
              col: best.col + c.col,
              colorIndex: piece.colorIndex,
            }))
          );
          break;
        }
      }
    }, 8000);
  }, [gameState]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [gameState?.score, gameState?.availablePieces, resetIdleTimer]);

  // Check for personal best proximity
  useEffect(() => {
    if (!gameState || !levelConfig || milestoneShownRef.current) return;
    const highScore = levelHighScores[levelConfig.levelNumber] ?? 0;
    if (highScore > 0 && gameState.score >= highScore && gameState.status === 'playing') {
      milestoneShownRef.current = true;
      setMilestoneMsg('New personal best!');
      setShowMilestone(true);
      setTimeout(() => setShowMilestone(false), 3500);
    } else if (highScore > 200 && gameState.score >= highScore - 200 && gameState.score < highScore && !milestoneShownRef.current) {
      milestoneShownRef.current = true;
      setMilestoneMsg(`${highScore - gameState.score} points from your best!`);
      setShowMilestone(true);
      setTimeout(() => setShowMilestone(false), 3500);
    }
  }, [gameState?.score]);

  const handleSelectPiece = useCallback((index: number) => {
    setActivePowerUp(null);
    if (selectedPieceIndex === index) {
      // Tap again to rotate the selected piece
      rotatePiece(index);
      setGhostCells([]);
      playSound('select');
    } else {
      selectPiece(index);
      setGhostCells([]);
      playSound('select');
    }
  }, [selectedPieceIndex, selectPiece, rotatePiece, playSound]);

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
      playPlacement(col, gameState.gridSize);
      pulseBoard();
      setGhostCells([]);
    }
  }, [selectedPieceIndex, gameState, placePiece, activePowerUp, applyPowerUp, usePowerUp, playSound, playPlacement, shakeBoard, pulseBoard]);

  const handleBoardLayout = useCallback((x: number, y: number, width: number, height: number) => {
    boardOriginRef.current = { x, y, width, height };
  }, []);

  const screenToBoard = useCallback((screenX: number, screenY: number, piece: Piece) => {
    const { x: bx, y: by } = boardOriginRef.current;
    const cellTotal = CELL_SIZE + CELL_GAP;
    const { width: pw, height: ph } = getPieceSize(piece);

    // The drag overlay renders centered on screenX, above screenY
    // Match the overlay positioning: centered horizontally, placed above finger
    const trayCellSize = 28;
    const trayGap = 3;
    const overlayH = ph * (trayCellSize + trayGap) + trayGap;

    // Center of the visual overlay piece in screen coords
    const pieceCenterX = screenX;
    const pieceCenterY = screenY - overlayH / 2 - 20;

    // Map the piece center to board coordinates
    const localX = pieceCenterX - bx - CELL_GAP;
    const localY = pieceCenterY - by - CELL_GAP;

    // Use bounding box center for consistent offset (not middle of cells array)
    const midCol = (pw - 1) / 2;
    const midRow = (ph - 1) / 2;

    const col = Math.round(localX / cellTotal - midCol);
    const row = Math.round(localY / cellTotal - midRow);
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
          playPlacement(col, gameState.gridSize);
          pulseBoard();
        }
      }
    }
    setDraggedPieceIndex(null);
    setDragPosition(null);
    setGhostCells([]);
  }, [gameState, screenToBoard, placePiece, playPlacement, pulseBoard]);

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
  const handleRetry = useCallback(() => { setShowLoseModal(false); setShowWinModal(false); setShowPauseMenu(false); setShowConfetti(false); setActivePowerUp(null); setDoubleCoinsUsed(false); resetLevel(); }, [resetLevel]);
  const handleHome = useCallback(() => { navigation.navigate('Home'); }, [navigation]);

  const handleWatchAd = useCallback(async () => {
    if (!canShowRewarded()) return;
    const earned = await showRewardedAd();
    if (earned) {
      addCoins(AD_REWARDS.coins.amount);
      playSound('select');
    }
  }, [addCoins, playSound]);

  const handleShare = useCallback(async () => {
    if (!gameState || !levelConfig) return;
    let message: string;
    if (isEndless) {
      message = `I scored ${gameState.score.toLocaleString()} in Zen Mode!\n\n` +
        `Lines: ${gameState.linesCleared} | Pieces: ${gameState.piecesPlaced}\n\n` +
        `Color Block Blast - Can you beat my score?`;
    } else {
      const starEmojis = '⭐'.repeat(stars);
      const worldName = currentWorld?.name ?? '';
      message = `I scored ${gameState.score.toLocaleString()} on Level ${levelConfig.levelNumber} ${starEmojis}\n` +
        (worldName ? `World: ${worldName}\n` : '') +
        `\nColor Block Blast - Can you beat my score?`;
    }
    try {
      await Share.share({ message });
    } catch {}
  }, [gameState, levelConfig, stars, isEndless, currentWorld]);

  const handleChallengeFriend = useCallback(async () => {
    if (!gameState || !levelConfig || isEndless) return;
    const challenge = createChallenge(levelConfig.levelNumber, gameState.score, displayName);
    await shareChallenge(challenge);
  }, [gameState, levelConfig, isEndless, displayName]);

  const handleDoubleCoins = useCallback(() => {
    if (doubleCoinsUsed) return;
    const bonus = calculateCoinReward(stars);
    addCoins(bonus);
    setDoubleCoinsUsed(true);
    playSound('combo');
  }, [doubleCoinsUsed, stars, addCoins, playSound]);

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

      {/* Tension vignette — red glow when board is filling up */}
      {tension > 0.3 && (
        <View
          style={[
            styles.tensionVignette,
            { opacity: Math.min((tension - 0.3) * 0.6, 0.3) },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Ambient particles — themed to current world */}
      <FloatingParticles count={8} colors={worldParticleColors} />

      {/* Clear flash overlay */}
      <ClearFlash visible={showClearFlash} color={clearFlashColor} />

      {/* Confetti overlay */}
      <Confetti visible={showConfetti} />

      {/* Live event indicator */}
      {getActiveEvents().length > 0 && (
        <View style={styles.eventIndicator}>
          <View style={[styles.eventDot, { backgroundColor: getActiveEvents()[0].color }]} />
          <Text style={[styles.eventIndicatorText, { color: getActiveEvents()[0].color }]}>
            {getActiveEvents()[0].name}
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Button title={'\u2039'} onPress={handleHome} variant="ghost" size="small" />
        <CurrencyDisplay coins={coins} gems={gems} compact />
        <View style={styles.headerRight}>
          <Button title={'\u21BB'} onPress={handleRetry} variant="ghost" size="small" />
          <Button title={'\u23F8'} onPress={handlePause} variant="ghost" size="small" />
        </View>
      </View>

      {/* Score display */}
      <ScoreDisplay
        score={gameState.score}
        combo={gameState.combo}
        objective={isEndless ? { type: 'score', target: gameState.score + 1000 } : gameState.objective}
        level={isEndless ? 0 : gameState.level}
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
          ghostCells={ghostCells.length > 0 ? ghostCells : hintCells}
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
        <ComboDisplay combo={gameState.combo} multiplier={gameState.lastScoreEvent?.multiplier ?? 1} />
        <MilestoneBanner message={milestoneMsg} visible={showMilestone} />
      </Animated.View>

      {/* Power-up bar */}
      <PowerUpBar
        inventory={powerUps}
        activePowerUp={activePowerUp}
        onActivate={handleActivatePowerUp}
        disabled={gameState.status !== 'playing'}
      />

      {/* Piece tray with swap button */}
      <View style={styles.trayRow}>
        <PieceTray
          pieces={gameState.availablePieces}
          selectedIndex={isPowerUpMode ? null : selectedPieceIndex}
          onSelectPiece={handleSelectPiece}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
        <View style={styles.trayActions}>
          <Button
            title="Undo"
            onPress={() => {
              if (undoLastMove()) {
                setGhostCells([]);
                playSound('select');
              }
            }}
            variant="ghost"
            size="small"
            disabled={!canUndo() || gameState.status !== 'playing'}
          />
          <Button
            title={gameState.swapsUsed === 0 ? 'Swap' : 'Swap'}
            onPress={() => {
              swapPieces();
              setGhostCells([]);
              playSound('select');
            }}
            variant="ghost"
            size="small"
            disabled={gameState.status !== 'playing'}
          />
          {selectedPieceIndex !== null && (
            <Text style={styles.rotateHint}>Tap piece to rotate</Text>
          )}
        </View>
      </View>

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
        {/* World unlock celebration */}
        {!isEndless && level + 1 <= 500 && getWorldForLevel(level + 1).id !== getWorldForLevel(level).id && (
          <View style={styles.worldUnlockBanner}>
            <GameIcon name={getWorldForLevel(level + 1).icon as any} size={16} color={getWorldForLevel(level + 1).color} />
            <Text style={[styles.worldUnlockText, { color: getWorldForLevel(level + 1).color }]}>
              {getWorldForLevel(level + 1).name} Unlocked!
            </Text>
          </View>
        )}
        <View style={styles.modalStars}>
          {[1, 2, 3].map((s) => (
            <GameIcon key={s} name={s <= stars ? 'star' : 'star-outline'} size={40} />
          ))}
        </View>
        <View style={styles.odometerWrap}>
          <ScoreOdometer value={gameState.score} fontSize={36} color={COLORS.textPrimary} />
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardText}>+{calculateCoinReward(stars)}{doubleCoinsUsed ? ' x2!' : ''}</Text>
          <GameIcon name="coin" size={18} />
        </View>
        {/* Mini leaderboard for social proof */}
        {!isEndless && (
          <Leaderboard
            playerScore={gameState.score}
            playerName={displayName}
            level={level}
          />
        )}

        <View style={styles.modalButtons}>
          <Button title="Next Level" onPress={handleNextLevel} variant="primary" size="medium" />
          {!doubleCoinsUsed && calculateCoinReward(stars) > 0 && (
            <Button
              title={`2x Coins (+${calculateCoinReward(stars)})`}
              onPress={handleDoubleCoins}
              variant="secondary"
              size="medium"
            />
          )}
          <Button title="Retry" onPress={handleRetry} variant="secondary" size="small" />
          <View style={styles.shareRow}>
            {!isEndless && (
              <Button title="Challenge" onPress={handleChallengeFriend} variant="ghost" size="small" />
            )}
            <Button title="Share" onPress={handleShare} variant="ghost" size="small" />
            <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
          </View>
        </View>
      </Modal>

      {/* Lose Modal */}
      <Modal visible={showLoseModal} onClose={() => {}} dismissable={false}>
        <View style={styles.modalIconWrap}>
          <GameIcon name={isEndless ? 'sparkle' : 'target'} size={48} color={isEndless ? COLORS.accentGold : COLORS.textMuted} />
        </View>
        <Text style={styles.modalTitle}>{isEndless ? 'Game Over!' : 'No More Moves'}</Text>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        {isEndless ? (
          <View style={styles.endlessStats}>
            <Text style={styles.endlessStatText}>Pieces placed: {gameState.piecesPlaced}</Text>
            <Text style={styles.endlessStatText}>Lines cleared: {gameState.linesCleared}</Text>
            <Text style={styles.endlessStatText}>Best combo: {gameState.combo}x</Text>
            {zenHighScore > 0 && (
              <Text style={[styles.endlessStatText, gameState.score >= zenHighScore && { color: COLORS.accentGold, fontWeight: '800' }]}>
                {gameState.score >= zenHighScore ? 'New best!' : `Best: ${formatScore(zenHighScore)}`}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.modalTarget}>
            Target: {formatScore(levelConfig.objective.target)}
          </Text>
        )}
        {/* Rescue offer after 2+ failures on same level */}
        {!isEndless && consecutiveFailures >= 2 && lastFailedLevel === level && !rescueClaimed && (
          <View style={styles.rescueCard}>
            <Text style={styles.rescueText}>Struggling? Here's a free Bomb to help!</Text>
            <Button
              title="Claim Free Bomb"
              onPress={() => { addPowerUp('bomb', 1); setRescueClaimed(true); playSound('combo'); }}
              variant="secondary"
              size="small"
            />
          </View>
        )}

        {/* Continue button — near-miss only, costs 10 gems */}
        {!isEndless && !continueUsed && gameState.score >= levelConfig.objective.target * 0.7 && gems >= 10 && (
          <Button
            title="Continue (10 Gems)"
            onPress={() => {
              if (spendGems(10) && continueGame()) {
                setContinueUsed(true);
                setShowLoseModal(false);
                playSound('combo');
              }
            }}
            variant="primary"
            size="medium"
            style={styles.continueButton}
          />
        )}

        <View style={styles.modalButtons}>
          <Button title={isEndless ? 'Play Again' : 'Try Again'} onPress={handleRetry} variant="primary" size="medium" />
          {!isEndless && canShowRewarded() && (
            <Button
              title={`Watch Ad +${AD_REWARDS.coins.amount}`}
              onPress={handleWatchAd}
              variant="secondary"
              size="medium"
            />
          )}
          <View style={styles.shareRow}>
            <Button title="Share" onPress={handleShare} variant="ghost" size="small" />
            <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
          </View>
        </View>
      </Modal>
      {/* Feature unlock celebration */}
      <FeatureUnlockBanner
        feature={unlockedFeature}
        visible={showFeatureUnlock}
        onDismiss={() => setShowFeatureUnlock(false)}
      />

      {/* Tutorial overlay for first-time players */}
      <TutorialOverlay visible={showTutorial} onComplete={completeTutorial} />

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
  endlessStats: {
    marginBottom: 20,
    gap: 4,
    alignItems: 'center',
  },
  endlessStatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalButtons: {
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  trayRow: {
    width: '100%',
  },
  trayActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: SPACING.xs,
  },
  rotateHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  continueButton: {
    width: '100%',
    marginBottom: 8,
  },
  worldUnlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.surface}`,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  worldUnlockText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tensionVignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderColor: COLORS.accent,
    borderRadius: 0,
    zIndex: 1,
    elevation: 1,
  },
  rescueCard: {
    backgroundColor: `${COLORS.accentGold}12`,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  rescueText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentGold,
    textAlign: 'center',
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  eventIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  odometerWrap: {
    marginBottom: 4,
    alignItems: 'center',
  },
});
