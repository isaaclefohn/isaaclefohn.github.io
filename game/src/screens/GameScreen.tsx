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
import { Piece, getPieceCells, getPieceCentroid } from '../game/engine/Piece';
import { canPlace, findBestPlacement } from '../game/engine/Board';
import { getWorldForLevel } from '../game/levels/Worlds';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { PowerUpBar } from '../components/PowerUpBar';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { GameIcon } from '../components/GameIcon';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ScorePopup } from '../components/animations/ScorePopup';
import { HypeText } from '../components/animations/HypeText';
import { RadialBurst } from '../components/animations/RadialBurst';
import { ScoreFlyUp } from '../components/animations/ScoreFlyUp';
import { ComboBanner } from '../components/animations/ComboBanner';
import { Confetti } from '../components/animations/Confetti';
import { PowerUpType, previewBomb, previewRowClear, previewColorClear } from '../game/powerups/PowerUpManager';
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
import { getNewlyUnlockedFeatures, isFeatureUnlocked, FeatureGate } from '../game/progression/FeatureGating';
import { useSettingsStore } from '../store/settingsStore';
import { GameTip, TipId } from '../components/GameTip';
import { isBossLevel } from '../game/levels/LevelGenerator';
import {
  buildDailyShareCard,
  getDailyPuzzleId,
  getDailyPuzzleLabel,
  getDailyPuzzleNumber,
} from '../game/challenges/DailyPuzzle';
import { getLuckyLevelReward, LuckyLevelReward } from '../game/rewards/LuckyLevel';
import { LuckyLevelModal } from '../components/LuckyLevelModal';
import { WorldCompleteModal } from '../components/WorldCompleteModal';
import { getWorldCompletionStatus, getWorldReward, WorldReward } from '../game/rewards/WorldRewards';
import { calculateSRChange, getSkillTier } from '../game/systems/SkillRating';
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

/** Drag overlay tuning — the piece's visual centroid floats this many pixels
 *  above the user's finger so the thumb never occludes where the piece lands. */
const DRAG_OVERLAY_LIFT = 64;
const DRAG_TRAY_CELL_SIZE = 28;
const DRAG_TRAY_GAP = 3;

export const GameScreen: React.FC<GameScreenProps> = ({ navigation, route }) => {
  const { level, endless, daily } = route.params;
  const isEndless = endless === true;
  const isDaily = daily === true;
  const {
    gameState,
    levelConfig,
    selectedPieceIndex,
    stars,
    loadLevel,
    loadEndless,
    loadDailyPuzzle,
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
  const { powerUps, usePowerUp, coins, gems, addCoins, addGems, addPowerUp, spendGems, levelHighScores, levelStars, zenHighScore, consecutiveFailures, lastFailedLevel, displayName, highestLevel, skillRating, claimedWorldClears, claimedWorldPerfects, claimWorldClear, claimWorldPerfect, dailyPuzzleStreak } = usePlayerStore();
  const { tutorialCompleted, completeTutorial, shownTips, markTipShown } = useSettingsStore();

  const showTutorial = !isEndless && level === 1 && !tutorialCompleted;

  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [showComboBanner, setShowComboBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHype, setShowHype] = useState(false);
  const [hypeText, setHypeText] = useState('');
  const [hypeColor, setHypeColor] = useState<string>(COLORS.accent);
  const [showBurst, setShowBurst] = useState(false);
  const [burstColor, setBurstColor] = useState<string>('#FBBF24');
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
  const [powerUpPreview, setPowerUpPreview] = useState<{ row: number; col: number; colorIndex: number }[]>([]);
  const [flyUpData, setFlyUpData] = useState<{ points: number; row: number; col: number; isCombo: boolean; key: number } | null>(null);
  const flyUpKeyRef = useRef(0);
  const lastPlacementRef = useRef<{ row: number; col: number }>({ row: 4, col: 4 });
  const [activeTip, setActiveTip] = useState<TipId | null>(null);
  const [luckyReward, setLuckyReward] = useState<LuckyLevelReward | null>(null);
  const [showLuckyLevel, setShowLuckyLevel] = useState(false);
  const [srChange, setSrChange] = useState<number | null>(null);
  const [worldReward, setWorldReward] = useState<WorldReward | null>(null);
  const [worldRewardPerfect, setWorldRewardPerfect] = useState(false);
  const [showWorldComplete, setShowWorldComplete] = useState(false);

  // Difficulty label for the current level
  const difficultyInfo = !isEndless && level > 0
    ? level <= 20 ? { label: 'Easy', color: COLORS.success }
      : level <= 100 ? { label: 'Normal', color: COLORS.info }
      : level <= 200 ? { label: 'Hard', color: COLORS.warning }
      : { label: 'Expert', color: COLORS.danger }
    : null;
  const isWeekly = level === -1;
  const isBoss = !isEndless && level > 0 && isBossLevel(level);

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
    if (isDaily) {
      loadDailyPuzzle();
    } else if (isEndless) {
      loadEndless();
    } else {
      loadLevel(level);
    }
  }, [level, isEndless, isDaily, loadLevel, loadEndless, loadDailyPuzzle]);

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
      // Calculate SR change for display
      if (!isEndless && isFeatureUnlocked('skill_rating', highestLevel)) {
        const change = calculateSRChange({
          won: true,
          level: Math.abs(level),
          stars: stars,
          scorePercent: levelConfig ? (gameState.score / levelConfig.objective.target) * 100 : 100,
          currentSR: skillRating,
        });
        setSrChange(change);
      }
      // Check for feature unlocks (previous highest was level-1 since we just completed `level`)
      if (!isEndless && level > 0) {
        const newFeatures = getNewlyUnlockedFeatures(level - 1, level);
        if (newFeatures.length > 0) {
          setTimeout(() => {
            setUnlockedFeature(newFeatures[0]);
            setShowFeatureUnlock(true);
          }, 1200);
        }
        // Check for lucky level milestone
        const lucky = getLuckyLevelReward(level);
        if (lucky) {
          setLuckyReward(lucky);
          setTimeout(() => setShowLuckyLevel(true), 1800);
        }
        // Check for world completion (with updated stars including this win)
        const worldIndex = Math.ceil(level / 50);
        const world = getWorldForLevel(level);
        const updatedStars = { ...levelStars, [level]: Math.max(levelStars[level] ?? 0, stars) };
        const worldStatus = getWorldCompletionStatus(worldIndex, updatedStars);
        if (worldStatus.perfected && !claimedWorldPerfects.includes(world.id)) {
          setWorldReward(getWorldReward(worldIndex));
          setWorldRewardPerfect(true);
          setTimeout(() => setShowWorldComplete(true), 2400);
        } else if (worldStatus.cleared && !claimedWorldClears.includes(world.id)) {
          setWorldReward(getWorldReward(worldIndex));
          setWorldRewardPerfect(false);
          setTimeout(() => setShowWorldComplete(true), 2400);
        }
      }
    } else if (gameState?.status === 'lost') {
      playSound('gameOver');
      shakeBoard(2);
      setTimeout(() => setShowLoseModal(true), 400);
      // Calculate SR change for display
      if (!isEndless && level > 0 && isFeatureUnlocked('skill_rating', highestLevel)) {
        const change = calculateSRChange({
          won: false,
          level,
          stars: 0,
          scorePercent: levelConfig ? (gameState.score / levelConfig.objective.target) * 100 : 0,
          currentSR: skillRating,
        });
        setSrChange(change);
      }
    }
  }, [gameState?.status, playSound, shakeBoard]);

  // Handle score events
  useEffect(() => {
    if (gameState?.lastScoreEvent) {
      const event = gameState.lastScoreEvent;
      setLastPoints(event.points);
      setLastCombo(event.combo);
      setShowScorePopup(true);

      // Show fly-up at placement position
      if (event.breakdown.clearBonus > 0) {
        flyUpKeyRef.current++;
        setFlyUpData({
          points: event.points,
          row: lastPlacementRef.current.row,
          col: lastPlacementRef.current.col,
          isCombo: event.combo > 1,
          key: flyUpKeyRef.current,
        });
      }

      if (event.perfectClear) {
        playSound('combo');
        setShowComboBanner(true);
        setShowConfetti(true);
        setClearFlashColor(COLORS.accentGold);
        setShowClearFlash(true);
        shakeBoard(3);
        setHypeText('PERFECT!');
        setHypeColor(COLORS.accentGold);
        setShowHype(true);
        setBurstColor(COLORS.accentGold);
        setShowBurst(true);
        setTimeout(() => setShowConfetti(false), 2500);
        setTimeout(() => setShowClearFlash(false), 400);
      } else if (event.chromaticClears > 0) {
        // Chromatic clear — our unique mechanic
        playSound('combo');
        setShowComboBanner(true);
        setClearFlashColor(COLORS.accent);
        setShowClearFlash(true);
        shakeBoard(1.5 + event.chromaticClears * 0.5);
        setHypeText(event.chromaticClears >= 2 ? 'RAINBOW!' : 'CHROMATIC!');
        setHypeColor(COLORS.accent);
        setShowHype(true);
        setBurstColor(COLORS.accent);
        setShowBurst(true);
        setTimeout(() => setShowClearFlash(false), 400);
      } else if (event.linesCleared >= 3) {
        playSound('combo');
        setShowComboBanner(true);
        setClearFlashColor(COLORS.accent);
        setShowClearFlash(true);
        shakeBoard(2);
        setHypeText(event.linesCleared >= 5 ? 'INCREDIBLE!' : 'AMAZING!');
        setHypeColor(COLORS.accent);
        setShowHype(true);
        setBurstColor(COLORS.accent);
        setShowBurst(true);
        setTimeout(() => setShowClearFlash(false), 400);
      } else if (event.combo >= 4) {
        setHypeText('MEGA COMBO!');
        setHypeColor(COLORS.accentGold);
        setShowHype(true);
        setBurstColor(COLORS.accentGold);
        setShowBurst(true);
        playSound('combo');
        setShowComboBanner(true);
        setClearFlashColor(COLORS.accent);
        setShowClearFlash(true);
        shakeBoard(Math.min(event.combo * 0.5, 2.5));
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
      playSound('combo'); // Haptic + sound for new best
      setTimeout(() => setShowMilestone(false), 3500);
    } else if (highScore > 200 && gameState.score >= highScore - 200 && gameState.score < highScore && !milestoneShownRef.current) {
      milestoneShownRef.current = true;
      setMilestoneMsg(`${highScore - gameState.score} points from your best!`);
      setShowMilestone(true);
      playSound('select'); // Light haptic for approaching best
      setTimeout(() => setShowMilestone(false), 3500);
    }
  }, [gameState?.score]);

  // Contextual tips — show once per lifetime at relevant moments
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    // Boss level tip
    if (isBoss && !shownTips.includes('boss_level_tip')) {
      setActiveTip('boss_level_tip');
      markTipShown('boss_level_tip');
      return;
    }
    // Weekly challenge tip
    if (isWeekly && !shownTips.includes('weekly_challenge_tip')) {
      setActiveTip('weekly_challenge_tip');
      markTipShown('weekly_challenge_tip');
      return;
    }
    // Zen mode tip
    if (isEndless && !shownTips.includes('zen_mode_tip')) {
      setActiveTip('zen_mode_tip');
      markTipShown('zen_mode_tip');
      return;
    }
    // Rotate tip — show on level 2 or 3
    if (level >= 2 && level <= 3 && !shownTips.includes('rotate_tip')) {
      const timer = setTimeout(() => {
        setActiveTip('rotate_tip');
        markTipShown('rotate_tip');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Combo tip — triggered when player gets first combo
  useEffect(() => {
    if (gameState?.combo === 2 && !shownTips.includes('combo_tip')) {
      setActiveTip('combo_tip');
      markTipShown('combo_tip');
    }
  }, [gameState?.combo]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Show preview first, then apply
      let previewCells: { row: number; col: number }[] = [];
      if (activePowerUp === 'bomb') {
        previewCells = previewBomb(gameState.grid, row, col);
      } else if (activePowerUp === 'rowClear') {
        previewCells = previewRowClear(gameState.grid, row);
      } else if (activePowerUp === 'colorClear') {
        const colorIdx = gameState.grid[row]?.[col] ?? 0;
        if (colorIdx > 0) previewCells = previewColorClear(gameState.grid, colorIdx);
      }

      // Brief flash of preview then apply
      if (previewCells.length > 0) {
        setPowerUpPreview(previewCells.map(c => ({ ...c, colorIndex: 0 })));
        setTimeout(() => setPowerUpPreview([]), 300);
      }

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
      lastPlacementRef.current = { row, col };
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

    // Anchor on the FILLED-cell centroid so unorthodox shapes (S/Z/L/T,
    // pentominoes) line up under the finger where the user visually sees
    // the piece's center of mass — not an empty bounding-box corner.
    const centroid = getPieceCentroid(piece);

    // Keep the drag overlay's centroid a fixed distance above the finger
    // (matches DRAG_OVERLAY_LIFT in the render path below).
    const pieceCenterX = screenX;
    const pieceCenterY = screenY - DRAG_OVERLAY_LIFT;

    // Map the centroid screen position to a cell index on the board.
    const localX = pieceCenterX - bx - CELL_GAP;
    const localY = pieceCenterY - by - CELL_GAP;

    // localX/cellTotal gives a fractional cell coordinate where 0 = center
    // of the first cell's left edge; the +0.5 shifts to cell-center space
    // before subtracting the centroid offset so rounding snaps correctly.
    const col = Math.round(localX / cellTotal - centroid.col);
    const row = Math.round(localY / cellTotal - centroid.row);
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
          lastPlacementRef.current = { row, col };
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
    if (isDaily) {
      // Wordle-style shareable result card. Same shape every day so it
      // renders predictably in iMessage / WhatsApp / X / Discord and
      // creates the viral share loop we want out of the daily puzzle.
      const threeStar = levelConfig.starThresholds?.[2] ?? 1;
      message = buildDailyShareCard({
        puzzleNumber: getDailyPuzzleNumber(),
        dateLabel: getDailyPuzzleLabel(),
        stars,
        score: gameState.score,
        linesCleared: gameState.linesCleared,
        bestCombo: gameState.combo ?? 0,
        piecesPlaced: gameState.piecesPlaced,
        streak: dailyPuzzleStreak,
        scoreFraction: Math.min(1, gameState.score / threeStar),
      });
    } else if (isEndless) {
      message = `I scored ${gameState.score.toLocaleString()} in Zen Mode!\n\n` +
        `Lines: ${gameState.linesCleared} | Pieces: ${gameState.piecesPlaced}\n\n` +
        `Chroma Drop - Can you beat my score?`;
    } else {
      const starEmojis = '⭐'.repeat(stars);
      const worldName = currentWorld?.name ?? '';
      message = `I scored ${gameState.score.toLocaleString()} on Level ${levelConfig.levelNumber} ${starEmojis}\n` +
        (worldName ? `World: ${worldName}\n` : '') +
        `\nChroma Drop - Can you beat my score?`;
    }
    try {
      await Share.share({ message });
    } catch {}
  }, [gameState, levelConfig, stars, isEndless, isDaily, currentWorld, dailyPuzzleStreak]);

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
        {/* Level info with difficulty badge */}
        <View style={styles.headerCenter}>
          {isWeekly && (
            <View style={[styles.diffBadge, { backgroundColor: `${COLORS.accent}20` }]}>
              <Text style={[styles.diffBadgeText, { color: COLORS.accent }]}>WEEKLY</Text>
            </View>
          )}
          {isBoss && (
            <View style={[styles.diffBadge, { backgroundColor: `${COLORS.accentGold}20` }]}>
              <Text style={[styles.diffBadgeText, { color: COLORS.accentGold }]}>BOSS</Text>
            </View>
          )}
          {difficultyInfo && !isBoss && (
            <View style={[styles.diffBadge, { backgroundColor: `${difficultyInfo.color}20` }]}>
              <Text style={[styles.diffBadgeText, { color: difficultyInfo.color }]}>{difficultyInfo.label}</Text>
            </View>
          )}
        </View>
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
        <HypeText
          text={hypeText}
          color={hypeColor}
          visible={showHype}
          onComplete={() => setShowHype(false)}
        />
        <RadialBurst
          visible={showBurst}
          color={burstColor}
          onComplete={() => setShowBurst(false)}
        />
        <ComboDisplay combo={gameState.combo} multiplier={gameState.lastScoreEvent?.multiplier ?? 1} />
        {flyUpData && (
          <ScoreFlyUp
            key={flyUpData.key}
            points={flyUpData.points}
            row={flyUpData.row}
            col={flyUpData.col}
            isCombo={flyUpData.isCombo}
            onComplete={() => setFlyUpData(null)}
          />
        )}
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
        {!isEndless && gameState.score > (levelHighScores[level] ?? 0) && (levelHighScores[level] ?? 0) > 0 && (
          <Text style={styles.newBestLabel}>NEW BEST!</Text>
        )}
        {/* Detailed stats summary */}
        <View style={styles.statsSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pieces</Text>
            <Text style={styles.summaryValue}>{gameState.piecesPlaced}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Lines</Text>
            <Text style={styles.summaryValue}>{gameState.linesCleared}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Combo</Text>
            <Text style={styles.summaryValue}>{gameState.combo}x</Text>
          </View>
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardText}>+{calculateCoinReward(stars)}{doubleCoinsUsed ? ' x2!' : ''}</Text>
          <GameIcon name="coin" size={18} />
        </View>
        {srChange !== null && (
          <View style={styles.srChangeRow}>
            <GameIcon name="shield" size={14} color={getSkillTier(skillRating).color} />
            <Text style={[styles.srChangeText, { color: srChange >= 0 ? COLORS.success : COLORS.danger }]}>
              {srChange >= 0 ? '+' : ''}{srChange} SR
            </Text>
          </View>
        )}
        {/* Mini leaderboard for social proof */}
        {!isEndless && (
          <Leaderboard
            playerScore={gameState.score}
            playerName={displayName}
            level={level}
          />
        )}

        <View style={styles.modalButtons}>
          {isDaily ? (
            // Daily puzzle: sharing is the primary action. Wordle's entire
            // growth loop hinged on a big obvious share button — we mirror
            // it here and hide the irrelevant "Next Level" CTA.
            <Button title="Share Result" onPress={handleShare} variant="primary" size="medium" />
          ) : (
            <Button title="Next Level" onPress={handleNextLevel} variant="primary" size="medium" />
          )}
          {!isDaily && !doubleCoinsUsed && calculateCoinReward(stars) > 0 && (
            <Button
              title={`2x Coins (+${calculateCoinReward(stars)})`}
              onPress={handleDoubleCoins}
              variant="secondary"
              size="medium"
            />
          )}
          <Button title="Retry" onPress={handleRetry} variant="secondary" size="small" />
          <View style={styles.shareRow}>
            {!isEndless && !isDaily && (
              <Button title="Challenge" onPress={handleChallengeFriend} variant="ghost" size="small" />
            )}
            {!isDaily && (
              <Button title="Share" onPress={handleShare} variant="ghost" size="small" />
            )}
            <Button title="Home" onPress={handleHome} variant="ghost" size="small" />
          </View>
        </View>
      </Modal>

      {/* Lose Modal */}
      <Modal visible={showLoseModal} onClose={() => {}} dismissable={false}>
        <View style={styles.modalIconWrap}>
          <GameIcon name={isDaily ? 'sparkle' : isEndless ? 'sparkle' : 'target'} size={48} color={isDaily || isEndless ? COLORS.accentGold : COLORS.textMuted} />
        </View>
        <Text style={styles.modalTitle}>{isDaily ? 'Run Complete!' : isEndless ? 'Game Over!' : 'No More Moves'}</Text>
        {isDaily && (
          <View style={styles.modalStars}>
            {[1, 2, 3].map((s) => (
              <GameIcon key={s} name={s <= stars ? 'star' : 'star-outline'} size={36} />
            ))}
          </View>
        )}
        <Text style={styles.modalScore}>{formatScore(gameState.score)}</Text>
        {isDaily ? (
          <View style={styles.endlessStats}>
            <Text style={styles.endlessStatText}>Lines cleared: {gameState.linesCleared}</Text>
            <Text style={styles.endlessStatText}>Best combo: {gameState.combo}x</Text>
            {dailyPuzzleStreak > 1 && (
              <Text style={[styles.endlessStatText, { color: COLORS.accentGold, fontWeight: '800' }]}>
                {dailyPuzzleStreak}-day streak
              </Text>
            )}
          </View>
        ) : isEndless ? (
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
          <>
            <Text style={styles.modalTarget}>
              Target: {formatScore(levelConfig.objective.target)}
            </Text>
            <View style={styles.statsSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pieces</Text>
                <Text style={styles.summaryValue}>{gameState.piecesPlaced}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Lines</Text>
                <Text style={styles.summaryValue}>{gameState.linesCleared}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Progress</Text>
                <Text style={styles.summaryValue}>{Math.min(Math.round((gameState.score / levelConfig.objective.target) * 100), 100)}%</Text>
              </View>
            </View>
          </>
        )}
        {srChange !== null && !isDaily && (
          <View style={styles.srChangeRow}>
            <GameIcon name="shield" size={14} color={getSkillTier(skillRating).color} />
            <Text style={[styles.srChangeText, { color: COLORS.danger }]}>
              {srChange} SR
            </Text>
          </View>
        )}
        {/* Rescue offer after 2+ failures on same level */}
        {!isEndless && !isDaily && consecutiveFailures >= 2 && lastFailedLevel === level && !rescueClaimed && (
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

        {/* "Oops Shield" — if the player still has their one free undo
            available at game-over, offer it right here. App Store reviews
            of Block Blast / Woody Puzzle consistently highlight the
            "undo the move that killed me" escape hatch as the single
            most-wanted feature. We already track a one-shot undo
            snapshot on every placement, so this is essentially free. */}
        {!isEndless && canUndo() && (
          <Button
            title={isDaily ? 'Oops! Undo Last Move' : 'Oops! Undo (Free)'}
            onPress={() => {
              if (undoLastMove()) {
                setShowLoseModal(false);
                setGhostCells([]);
                playSound('combo');
              }
            }}
            variant="primary"
            size="medium"
            style={styles.continueButton}
          />
        )}

        {/* Continue button — near-miss only, costs 10 gems */}
        {!isEndless && !isDaily && !continueUsed && gameState.score >= levelConfig.objective.target * 0.7 && gems >= 10 && (
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
          {isDaily ? (
            // Daily puzzle "loss" = the run is over for today. Sharing is
            // the primary CTA; retry is hidden because you only get one
            // attempt per puzzle. Player goes home to wait for tomorrow.
            <>
              <Button title="Share Result" onPress={handleShare} variant="primary" size="medium" />
              <Button title="Home" onPress={handleHome} variant="secondary" size="medium" />
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
      </Modal>
      {/* Contextual tutorial tips */}
      <GameTip
        tipId={activeTip ?? 'combo_tip'}
        visible={activeTip !== null}
        onDismiss={() => setActiveTip(null)}
      />

      {/* Feature unlock celebration */}
      <FeatureUnlockBanner
        feature={unlockedFeature}
        visible={showFeatureUnlock}
        onDismiss={() => setShowFeatureUnlock(false)}
      />

      {/* Lucky level milestone modal */}
      <LuckyLevelModal
        visible={showLuckyLevel}
        reward={luckyReward}
        level={level}
        onClose={() => setShowLuckyLevel(false)}
      />

      {/* World completion modal */}
      <WorldCompleteModal
        visible={showWorldComplete}
        reward={worldReward}
        isPerfect={worldRewardPerfect}
        onClaim={() => {
          if (worldReward) {
            const rewardData = worldRewardPerfect ? worldReward.perfectReward : worldReward.clearReward;
            addCoins(rewardData.coins);
            addGems(rewardData.gems);
            if (worldRewardPerfect) {
              addPowerUp('bomb', worldReward.perfectReward.powerUps.bomb);
              addPowerUp('rowClear', worldReward.perfectReward.powerUps.rowClear);
              addPowerUp('colorClear', worldReward.perfectReward.powerUps.colorClear);
              claimWorldPerfect(worldReward.worldId);
            } else {
              claimWorldClear(worldReward.worldId);
            }
          }
          setShowWorldComplete(false);
        }}
        onClose={() => setShowWorldComplete(false)}
      />

      {/* Tutorial overlay for first-time players */}
      <TutorialOverlay visible={showTutorial} onComplete={completeTutorial} />

      {/* Drag overlay — floating piece following the finger.
          Positioned so the filled-cell centroid sits DRAG_OVERLAY_LIFT px
          above the finger, matching the anchor math in screenToBoard so the
          visible piece and the ghost cells always line up — even for
          unorthodox shapes (S/Z/L/T, pentominoes) whose bounding box
          contains empty corners. */}
      {draggedPieceIndex !== null && dragPosition && gameState.availablePieces[draggedPieceIndex] && (() => {
        const dragPiece = gameState.availablePieces[draggedPieceIndex];
        const centroid = getPieceCentroid(dragPiece);
        const cellTotal = DRAG_TRAY_CELL_SIZE + DRAG_TRAY_GAP;
        // Pixel offset from the overlay's top-left to the centroid point.
        // Each filled cell is drawn at (gap + c*cellTotal) in PieceRenderer,
        // so the centroid's pixel position is DRAG_TRAY_GAP + centroid.col * cellTotal
        // plus half a cell to land on the cell centre.
        const centroidPx = DRAG_TRAY_GAP + centroid.col * cellTotal + DRAG_TRAY_CELL_SIZE / 2;
        const centroidPy = DRAG_TRAY_GAP + centroid.row * cellTotal + DRAG_TRAY_CELL_SIZE / 2;
        return (
          <View style={styles.dragOverlay} pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                left: dragPosition.x - centroidPx,
                top: dragPosition.y - DRAG_OVERLAY_LIFT - centroidPy,
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
  newBestLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.round,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
  },
  summaryRow: {
    alignItems: 'center',
    gap: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  srChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  srChangeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
