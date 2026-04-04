/**
 * Premium button component with press animation, inner highlight, shadows, and variants.
 */

import React, { useRef, useCallback } from 'react';
import { View, Animated, Text, StyleSheet, ViewStyle, TextStyle, Pressable } from 'react-native';
import { COLORS, SHADOWS, RADII } from '../../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.base,
          variantStyles[variant],
          sizeStyles[size],
          variant === 'primary' && SHADOWS.medium,
          variant === 'secondary' && SHADOWS.small,
          disabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {/* Inner highlight for depth on primary buttons */}
        {variant === 'primary' && (
          <View style={[styles.innerHighlight, sizeRadii[size]]} />
        )}
        {icon && <Text style={[styles.icon, sizeIconStyles[size]]}>{icon}</Text>}
        <Text
          style={[
            styles.text,
            variantTextStyles[variant],
            sizeTextStyles[size],
            textStyle,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const variantStyles: Record<string, ViewStyle> = {
  primary: {
    backgroundColor: COLORS.accent,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accentDark,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
};

const sizeStyles: Record<string, ViewStyle> = {
  small: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADII.sm },
  medium: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: RADII.md },
  large: { paddingVertical: 18, paddingHorizontal: 40, borderRadius: RADII.lg },
};

const sizeRadii: Record<string, ViewStyle> = {
  small: { borderTopLeftRadius: RADII.sm - 1, borderTopRightRadius: RADII.sm - 1 },
  medium: { borderTopLeftRadius: RADII.md - 1, borderTopRightRadius: RADII.md - 1 },
  large: { borderTopLeftRadius: RADII.lg - 1, borderTopRightRadius: RADII.lg - 1 },
};

const variantTextStyles: Record<string, TextStyle> = {
  primary: { color: COLORS.textPrimary },
  secondary: { color: COLORS.textSecondary },
  ghost: { color: COLORS.textSecondary },
};

const sizeTextStyles: Record<string, TextStyle> = {
  small: { fontSize: 13 },
  medium: { fontSize: 16 },
  large: { fontSize: 20 },
};

const sizeIconStyles: Record<string, TextStyle> = {
  small: { fontSize: 14, marginRight: 4 },
  medium: { fontSize: 18, marginRight: 6 },
  large: { fontSize: 22, marginRight: 8 },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  icon: {},
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
