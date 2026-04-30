import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface HubMenuModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  accent?: string;
  children: React.ReactNode;
}

export const HubMenuModal: React.FC<HubMenuModalProps> = ({
  visible,
  onClose,
  title,
  accent = COLORS.textPrimary,
  children,
}) => {
  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.body}>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 300,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
});
