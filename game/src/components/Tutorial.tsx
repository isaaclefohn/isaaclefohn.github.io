/**
 * Tutorial overlay for first-time players.
 * Shows a series of instructional steps explaining gameplay mechanics.
 * Uses custom GameIcon instead of emojis.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GameIcon, IconName } from './GameIcon';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

interface TutorialStep {
  title: string;
  description: string;
  icon: IconName;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Color Block Blast!',
    description: 'Place blocks on the grid to fill complete rows or columns. Cleared lines score points!',
    icon: 'gamepad',
  },
  {
    title: 'Select & Place',
    description: 'Tap a piece then tap the board, or drag a piece directly onto the board. You get 3 pieces per round.',
    icon: 'pointer',
  },
  {
    title: 'Clear Lines',
    description: 'Fill an entire row or column to clear it and earn bonus points. Chain clears for combo multipliers!',
    icon: 'sparkle',
  },
  {
    title: 'Power-Ups',
    description: 'Use bombs, row clears, and color clears to get out of tight spots. Buy them in the shop!',
    icon: 'bomb',
  },
  {
    title: 'Reach the Target',
    description: 'Hit the score target to complete each level and earn stars. Get 3 stars for the best rewards!',
    icon: 'star',
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
        <View style={styles.iconContainer}>
          <GameIcon name={step.icon} size={40} />
        </View>
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
    borderRadius: RADII.xl,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.large,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
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
    borderRadius: RADII.md,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.small,
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
