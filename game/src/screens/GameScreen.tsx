/**
 * Core gameplay screen for Block Blitz.
 * Composes the game board, piece tray, score display, and game-over/win modals.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useGameEngine } from '../hooks/useGameEngine';
import { useSound } from '../hooks/useSound';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { GameBoard } from '../components/GameBoard';
import { PieceTray } from '../components/PieceTray';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Piece } from '../game/engine/Piece';
import { canPlace } from '../game/engine/Board';
import { getPieceCells } from '../game/engine/Piece';
import { COLORS } from '../utils/constants';
import { formatScore } from '../utils/formatters';
import { calculateCoinReward } from '../game/engine/Scoring';
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
    resetLevel,
  } = useGameEngine();

  const { playSound } = useSound();
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);

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
    } else if (gameState?.status === 'lost') {
      playSound('gameOver');
      setShowLoseModal(true);
    }
  }, [gameState?.status, playSound]);

  // Handle score events for sound
  useEffect(() => {
    if (gameState?.lastScoreEvent) {
      if (gameState.lastScoreEvent.combo > 1) {
        playSound('combo');
      } else if (gameState.lastScoreEvent.breakdown.clearBonus > 0) {
        playSound('clear');
      }
    }
  }, [gameState?.lastScoreEvent, playSound]);

  const handleSelectPiece = useCallback((index: number) => {
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
    if (selectedPieceIndex === null || !gameState) return;

    const success = placePiece(selectedPieceIndex, row, col);
    if (success) {
      playSound('place');
      setGhostCells([]);
    }
  }, [selectedPieceIndex, gameState, placePiece, playSound]);

  const handleBoardLayout = useCallback((_x: number, _y: number) => {
    // Board position tracked for future drag-and-drop
  }, []);

  const handleNextLevel = useCallback(() => {
    setShowWinModal(false);
    navigation.replace('Game', { level: level + 1 });
  }, [navigation, level]);

  const handleRetry = useCallback(() => {
    setShowLoseModal(false);
    setShowWinModal(false);
    resetLevel();
  }, [resetLevel]);

  const handleHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  if (!gameState || !levelConfig) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const selectedPiece: Piece | null =
    selectedPieceIndex !== null ? (gameState.availablePieces[selectedPieceIndex] ?? null) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button title="Back" onPress={handleHome} variant="ghost" size="small" />
        <Button title="Retry" onPress={handleRetry} variant="ghost" size="small" />
      </View>

      {/* Score display */}
      <ScoreDisplay
        score={gameState.score}
        combo={gameState.combo}
        objective={gameState.objective}
        level={gameState.level}
        stars={stars}
      />

      {/* Game board */}
      <View style={styles.boardContainer}>
        <GameBoard
          grid={gameState.grid}
          gridSize={gameState.gridSize}
          selectedPiece={selectedPiece}
          ghostCells={ghostCells}
          onCellTap={handleCellTap}
          onBoardLayout={handleBoardLayout}
        />
      </View>

      {/* Piece tray */}
      <PieceTray
        pieces={gameState.availablePieces}
        selectedIndex={selectedPieceIndex}
        onSelectPiece={handleSelectPiece}
      />

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
