/**
 * Subtle edge vignette overlay for visual depth.
 * Darkens screen edges to draw focus to the center.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

export const ScreenVignette: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top edge */}
      <View style={[styles.edge, styles.top]} />
      {/* Bottom edge */}
      <View style={[styles.edge, styles.bottom]} />
      {/* Left edge */}
      <View style={[styles.edgeHorizontal, styles.left]} />
      {/* Right edge */}
      <View style={[styles.edgeHorizontal, styles.right]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
  },
  top: {
    top: 0,
    backgroundColor: 'rgba(8, 7, 16, 0.35)',
  },
  bottom: {
    bottom: 0,
    backgroundColor: 'rgba(8, 7, 16, 0.45)',
  },
  edgeHorizontal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 30,
  },
  left: {
    left: 0,
    backgroundColor: 'rgba(8, 7, 16, 0.2)',
  },
  right: {
    right: 0,
    backgroundColor: 'rgba(8, 7, 16, 0.2)',
  },
});
