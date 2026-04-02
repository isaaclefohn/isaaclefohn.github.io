/**
 * Core gameplay screen with juicy animations, board shake, and confetti.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useGameEngine } from '../hooks/useGameEngine';
import { useSound } from '../hooks/useSound';
import { usePlayerStore } from '../store/playerStore';
import { GameBoard } from '../components/GameBoard';
import { PieceTray } from '../components/PieceTray';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { PowerUpBar } from '../components/PowerUpBar';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ScorePopup } from '../components/animations/ScorePopup';
import { ComboBanner } from '../components/animations/ComboBanner';
import { Confetti } from '../components/animations/Confetti';
import { Piece } from '../game/engine/Piece';
import { PowerUpType } from '../game/powerups/PowerUpManager';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
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

      if (event.combo > 1) {
        playSound('combo');
        setShowComboBanner(true);
        shakeBoard(Math.min(event.combo * 0.5, 2.5));
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

  const handleBoardLayout = useCallback((_x: number, _y: number) => {}, []);

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
      {/* Confetti overlay */}
      <Confetti visible={showConfetti} />

      {/* Header */}
      <View style={styles.header}>
        <Button title="‹" onPress={handleHome} variant="ghost" size="small" />
        <CurrencyDisplay coins={coins} gems={gems} compact />
        <Button title="⏸" onPress={handlePause} variant="ghost" size="small" />
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
      {isPowerUpMode && (
        <View style={styles.powerUpHint}>
          <Text style={styles.powerUpHintText}>
            Tap the board to use {activePowerUp === 'bomb' ? '💥 Bomb' : activePowerUp === 'rowClear' ? '⚡ Row Clear' : '🎨 Color Clear'}
          </Text>
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
      />

      {/* Pause Menu */}
      <Modal visible={showPauseMenu} onClose={handleResume} dismissable>
        <Text style={styles.modalTitle}>Paused</Text>
        <View style={styles.pauseStats}>
          <Text style={styles.pauseStatText}>Level {gameState.level}</Text>
          <Text style={styles.pauseStatText}>Score: {formatScore(gameState.score)}</Text>
        </View>
        <View style={styles.modalButtons}>
          <Button title="Resume" icon="▶" onPress={handleResume} variant="primary" size="medium" />
          <Button title="Restart" icon="🔄" onPress={handleRetry} variant="secondary" size="medium" />
          <Button title="Quit" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>

      {/* Win Modal */}
      <Modal visible={showWinModal} onClose={() => {}} dismissable={false}>
        <Text style={styles.modalEmoji}>🎉</Text>
        <Text style={styles.modalTitle}>Level Complete!</Text>
        <View style={styles.modalStars}>
          {[1, 2, 3].map((s) => (
            <Text key={s} style={[styles.modalStar, s <= stars && styles.modalStarActive]}>
              {s <= stars ? '\u2605' : '\u2606'}
            </Text>
          ))}
        </View>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardText}>+{calculateCoinReward(stars)}</Text>
          <Text style={styles.rewardIcon}>🪙</Text>
        </View>
        <View style={styles.modalButtons}>
          <Button title="Next Level" icon="▶" onPress={handleNextLevel} variant="primary" size="medium" />
          <Button title="Retry" onPress={handleRetry} variant="secondary" size="small" />
          <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>

      {/* Lose Modal */}
      <Modal visible={showLoseModal} onClose={() => {}} dismissable={false}>
        <Text style={styles.modalEmoji}>😔</Text>
        <Text style={styles.modalTitle}>No More Moves</Text>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        <Text style={styles.modalTarget}>
          Target: {formatScore(levelConfig.objective.target)}
        </Text>
        <View style={styles.modalButtons}>
          <Button title="Try Again" icon="🔄" onPress={handleRetry} variant="primary" size="medium" />
          {canShowRewarded() && (
            <Button
              title={`Watch Ad +${AD_REWARDS.coins.amount}`}
              icon="🎬"
              onPress={handleWatchAd}
              variant="secondary"
              size="medium"
            />
          )}
          <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>
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
  modalEmoji: {
    fontSize: 48,
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
  modalStar: {
    fontSize: 40,
    color: COLORS.textMuted,
  },
  modalStarActive: {
    color: COLORS.accentGold,
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
    gap: 4,
    marginBottom: 20,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  rewardIcon: {
    fontSize: 18,
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
});
