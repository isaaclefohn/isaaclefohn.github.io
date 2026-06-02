/**
 * Contextual tutorial overlay for first-time players.
 * Shows step-by-step tips overlaid on the game screen during level 1.
 * Each step highlights a different game mechanic with a pulsing pointer.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';
import { useSettingsStore } from '../store/settingsStore';

interface TutorialStep {
  title: string;
  message: string;
  position: 'top' | 'center' | 'bottom';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Place a Piece',
    message: 'Drag a piece from the tray onto the board (or tap it, then tap a spot).',
    position: 'bottom',
  },
  {
    title: 'Clear Lines',
    message: 'Fill a whole row or column to clear it and score. Clear several at once for combos!',
    position: 'center',
  },
  {
    title: 'Chroma Bonus',
    message: 'Clear a line that is ALL ONE COLOR for a big Chroma bonus — the signature move. Plan your colors!',
    position: 'center',
  },
  {
    title: 'Power-Ups',
    message: 'Stuck? Use Bombs, Row Clears, and Color Clears. Reach the target score to win — up to 3 stars.',
    position: 'bottom',
  },
];

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ visible, onComplete }) => {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulsing dot animation — suppressed under reduced motion (the
      // one-shot fade-in above still runs).
      if (reducedMotion) return;
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible, fadeAnim, pulseAnim, reducedMotion]);

  const handleNext = useCallback(() => {
    if (step >= TUTORIAL_STEPS.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onComplete());
    } else {
      setStep(s => s + 1);
    }
  }, [step, fadeAnim, onComplete]);

  const handleSkip = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onComplete());
  }, [fadeAnim, onComplete]);

  if (!visible) return null;

  const currentStep = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Pressable style={styles.touchArea} onPress={handleNext}>
        {/* Tooltip positioned by step */}
        <View style={[
          styles.tooltipContainer,
          currentStep.position === 'top' && styles.positionTop,
          currentStep.position === 'center' && styles.positionCenter,
          currentStep.position === 'bottom' && styles.positionBottom,
        ]}>
          <View style={[styles.tooltip, SHADOWS.medium]}>
            {/* Step indicator dots */}
            <View style={styles.dotsRow}>
              {TUTORIAL_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
                />
              ))}
            </View>

            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.message}>{currentStep.message}</Text>

            <View style={styles.buttonRow}>
              {!isLast && (
                <Pressable onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              )}
              <Pressable onPress={handleNext} style={styles.nextButton}>
                <Text style={styles.nextText}>{isLast ? 'Let\'s Go!' : 'Next'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Pulsing pointer arrow */}
          {currentStep.position === 'bottom' && (
            <Animated.View style={[styles.pointer, styles.pointerDown, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.pointerArrow}>▼</Text>
            </Animated.View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 7, 16, 0.7)',
    zIndex: 10000,
    elevation: 10000,
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
  },
  tooltipContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  positionTop: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
  },
  positionCenter: {
    // default — centered by flex
  },
  positionBottom: {
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
  },
  tooltip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingVertical: 20,
    paddingHorizontal: 24,
    maxWidth: 320,
    width: '100%',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceBorder,
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 20,
  },
  dotDone: {
    backgroundColor: COLORS.accentDark,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  nextButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: RADII.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accentDark,
  },
  nextText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  pointer: {
    marginTop: 8,
  },
  pointerDown: {},
  pointerArrow: {
    fontSize: 24,
    color: COLORS.accent,
  },
});
