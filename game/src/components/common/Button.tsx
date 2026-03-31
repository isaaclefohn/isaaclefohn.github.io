/**
 * Reusable button component with primary/secondary variants.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: COLORS.accent },
  secondary: { backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.accent },
  ghost: { backgroundColor: 'transparent' },
};

const sizeStyles: Record<string, ViewStyle> = {
  small: { paddingVertical: 8, paddingHorizontal: 16 },
  medium: { paddingVertical: 14, paddingHorizontal: 28 },
  large: { paddingVertical: 18, paddingHorizontal: 40 },
};

const variantTextStyles: Record<string, TextStyle> = {
  primary: { color: COLORS.textPrimary },
  secondary: { color: COLORS.accent },
  ghost: { color: COLORS.textSecondary },
};

const sizeTextStyles: Record<string, TextStyle> = {
  small: { fontSize: 14 },
  medium: { fontSize: 16 },
  large: { fontSize: 20 },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
