import React from 'react';
import { View, StyleSheet } from 'react-native';

const VIGNETTE_COLOR = 'rgba(8, 7, 16,';

const LAYERS = [
  { opacity: 0.18, size: 60 },
  { opacity: 0.10, size: 40 },
  { opacity: 0.05, size: 20 },
];

export const ScreenVignette: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {LAYERS.map((layer, i) => (
        <React.Fragment key={i}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: layer.size,
              backgroundColor: `${VIGNETTE_COLOR} ${layer.opacity})`,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: layer.size + 10,
              backgroundColor: `${VIGNETTE_COLOR} ${layer.opacity * 1.2})`,
            }}
          />
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
