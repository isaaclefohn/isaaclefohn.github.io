/**
 * Live event banner shown on home screen when an event is active.
 * Animated pulsing border and icon to draw attention.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { getActiveEvents, LiveEvent } from '../game/events/LiveEvents';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

const EventCard: React.FC<{ event: LiveEvent }> = ({ event }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Capture so unmount stops the driver work. Same fix shape as the
    // PieceTray / GiftBoxModal / WeeklyChallengeScreen leaks.
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: event.color,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <View style={[styles.iconBg, { backgroundColor: event.color + '20' }]}>
        <GameIcon name={event.icon as any} size={20} color={event.color} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.name, { color: event.color }]}>{event.name}</Text>
        <Text style={styles.desc}>{event.description}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: event.color }]}>
        <Text style={styles.badgeText}>LIVE</Text>
      </View>
    </Animated.View>
  );
};

export const EventBanner: React.FC = () => {
  const events = getActiveEvents();
  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    gap: 6,
    marginBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    padding: 10,
    gap: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.background,
    letterSpacing: 1,
  },
});
