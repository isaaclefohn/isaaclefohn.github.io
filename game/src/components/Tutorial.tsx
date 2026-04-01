/**
 * Tutorial overlay for first-time players.
 * Shows a series of instructional steps explaining gameplay mechanics.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';

interface TutorialStep {
  title: string;
  description: string;
  emoji: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Block Blitz!',
    description: 'Place blocks on the grid to fill complete rows or columns. Cleared lines score points!',
    emoji: '\uD83C\uDFAE',
  },
  {
    title: 'Select & Place',
    description: 'Tap a piece from the tray below, then tap the board to place it. You get 3 pieces per round.',
    emoji: '\uD83D\uDC46',
  },
  {
    title: 'Clear Lines',
    description: 'Fill an entire row or column to clear it and earn bonus points. Chain clears for combo multipliers!',
    emoji: '\u2728',
  },
  {
    title: 'Power-Ups',
    description: 'Use bombs, row clears, and color clears to get out of tight spots. Buy them in the shop!',
    emoji: '\uD83D\uDCA3',
  },
  {
    title: 'Reach the Target',
    description: 'Hit the score target to complete each level and earn stars. Get 3 stars for the best rewards!',
    emoji: '\u2B50',
  },
];

interface TutorialProps {
  onComplete: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[stepIndex];
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>

        <View style={styles.dots}>
          {TUTORIAL_STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>{isLast ? 'Start Playing!' : 'Next'}</Text>
          </TouchableOpacity>
          {!isLast && (
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gridEmpty,
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 20,
  },
  buttons: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  nextButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
