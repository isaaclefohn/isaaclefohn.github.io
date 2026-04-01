/**
 * Core gameplay screen for Block Blitz.
 * Composes the game board, piece tray, score display, power-ups, and modals.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
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
import { Piece } from '../game/engine/Piece';
import { PowerUpType } from '../game/powerups/PowerUpManager';
import { COLORS } from '../utils/constants';
import { formatScore } from '../utils/formatters';
import { calculateCoinReward } from '../game/engine/Scoring';
import { canShowRewarded, onLevelCompleted, AD_REWARDS } from '../services/ads';
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
  const [lastPoints, setLastPoints] = useState(0);
  const [lastCombo, setLastCombo] = useState(0);

  // Ghost preview state
  const [ghostCells, setGhostCells] = useState<{ row: number; col: number; colorIndex: number }[]>([]);

  // Load level on mount
  useEffect(() => {
    loadLevel(level);
  }, [level, loadLevel]);

  // Handle win/loss state changes
  useEffect(() => {
    if (gameState?.status === 'won') {
      playSound('levelWin');
      setShowWinModal(true);
      // Check if interstitial ad should show after win
      onLevelCompleted();
    } else if (gameState?.status === 'lost') {
      playSound('gameOver');
      setShowLoseModal(true);
    }
  }, [gameState?.status, playSound]);

  // Handle score events for sound and animations
  useEffect(() => {
    if (gameState?.lastScoreEvent) {
      const event = gameState.lastScoreEvent;

      // Trigger score popup
      setLastPoints(event.points);
      setLastCombo(event.combo);
      setShowScorePopup(true);

      if (event.combo > 1) {
        playSound('combo');
        setShowComboBanner(true);
      } else if (event.breakdown.clearBonus > 0) {
        playSound('clear');
      }
    }
  }, [gameState?.lastScoreEvent, playSound]);

  const handleSelectPiece = useCallback((index: number) => {
    // Deactivate power-up if selecting a piece
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

    // If a power-up is active, apply it instead of placing a piece
    if (activePowerUp) {
      const success = usePowerUp(activePowerUp);
      if (success) {
        const result = applyPowerUp(activePowerUp, row, col);
        if (result) {
          playSound('clear');
          setActivePowerUp(null);
          return;
        }
      }
      setActivePowerUp(null);
      return;
    }

    // Normal piece placement
    if (selectedPieceIndex === null) return;

    const success = placePiece(selectedPieceIndex, row, col);
    if (success) {
      playSound('place');
      setGhostCells([]);
    }
  }, [selectedPieceIndex, gameState, placePiece, activePowerUp, applyPowerUp, usePowerUp, playSound]);

  const handleBoardLayout = useCallback((_x: number, _y: number) => {
    // Board position tracked for future drag-and-drop
  }, []);

  const handleActivatePowerUp = useCallback((type: PowerUpType) => {
    if (activePowerUp === type) {
      setActivePowerUp(null);
    } else {
      // Deselect piece when activating power-up
      selectPiece(null);
      setGhostCells([]);
      setActivePowerUp(type);
      playSound('select');
    }
  }, [activePowerUp, selectPiece, playSound]);

  const handlePause = useCallback(() => {
    pauseGame();
    setShowPauseMenu(true);
  }, [pauseGame]);

  const handleResume = useCallback(() => {
    setShowPauseMenu(false);
    resumeGame();
  }, [resumeGame]);

  const handleNextLevel = useCallback(() => {
    setShowWinModal(false);
    navigation.replace('Game', { level: level + 1 });
  }, [navigation, level]);

  const handleRetry = useCallback(() => {
    setShowLoseModal(false);
    setShowWinModal(false);
    setShowPauseMenu(false);
    setActivePowerUp(null);
    resetLevel();
  }, [resetLevel]);

  const handleHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const handleWatchAd = useCallback(() => {
    // In production, this would show a real rewarded ad via AdMob
    // For now, grant the reward directly (will be wired to AdMob later)
    if (canShowRewarded()) {
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
      {/* Header */}
      <View style={styles.header}>
        <Button title="Back" onPress={handleHome} variant="ghost" size="small" />
        <CurrencyDisplay coins={coins} gems={gems} compact />
        <Button title="Pause" onPress={handlePause} variant="ghost" size="small" />
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
            Tap the board to use {activePowerUp === 'bomb' ? 'Bomb' : activePowerUp === 'rowClear' ? 'Row Clear' : 'Color Clear'}
          </Text>
        </View>
      )}

      {/* Game board */}
      <View style={styles.boardContainer}>
        <GameBoard
          grid={gameState.grid}
          gridSize={gameState.gridSize}
          selectedPiece={isPowerUpMode ? null : selectedPiece}
          ghostCells={ghostCells}
          onCellTap={handleCellTap}
          onBoardLayout={handleBoardLayout}
        />

        {/* Score popup animation */}
        <ScorePopup
          points={lastPoints}
          combo={lastCombo}
          visible={showScorePopup}
          onComplete={() => setShowScorePopup(false)}
        />

        {/* Combo banner animation */}
        <ComboBanner
          combo={lastCombo}
          visible={showComboBanner}
        />
      </View>

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
          <Button title="Resume" onPress={handleResume} variant="primary" size="medium" />
          <Button title="Restart" onPress={handleRetry} variant="secondary" size="medium" />
          <Button title="Quit to Menu" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>

      {/* Win Modal */}
      <Modal visible={showWinModal} onClose={() => {}} dismissable={false}>
        <Text style={styles.modalTitle}>Level Complete!</Text>
        <View style={styles.modalStars}>
          {[1, 2, 3].map((s) => (
            <Text key={s} style={[styles.modalStar, s <= stars && styles.modalStarActive]}>
              {s <= stars ? '\u2605' : '\u2606'}
            </Text>
          ))}
        </View>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        <Text style={styles.modalReward}>
          +{calculateCoinReward(stars)} coins
        </Text>
        <View style={styles.modalButtons}>
          <Button title="Next Level" onPress={handleNextLevel} variant="primary" size="medium" />
          <Button title="Retry" onPress={handleRetry} variant="secondary" size="small" />
          <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
        </View>
      </Modal>

      {/* Lose Modal */}
      <Modal visible={showLoseModal} onClose={() => {}} dismissable={false}>
        <Text style={styles.modalTitle}>Game Over</Text>
        <Text style={styles.modalSubtitle}>No more moves!</Text>
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        <Text style={styles.modalTarget}>
          Target: {formatScore(levelConfig.objective.target)}
        </Text>
        <View style={styles.modalButtons}>
          <Button title="Try Again" onPress={handleRetry} variant="primary" size="medium" />
          {canShowRewarded() && (
            <Button
              title={`Watch Ad (+${AD_REWARDS.coins.amount} coins)`}
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
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  powerUpHint: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: `${COLORS.accentGold}20`,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  powerUpHintText: {
    fontSize: 13,
    fontWeight: '600',
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
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  modalStars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalStar: {
    fontSize: 36,
    color: COLORS.textSecondary,
  },
  modalStarActive: {
    color: COLORS.accentGold,
  },
  modalScore: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalReward: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accentGold,
    marginBottom: 20,
  },
  modalTarget: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  modalButtons: {
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
});
